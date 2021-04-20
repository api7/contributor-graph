package gcpdb

import (
	"context"
	"fmt"
	"io/ioutil"
	"math"
	"net/http"
	"sort"
	"strings"
	"time"

	"cloud.google.com/go/datastore"
	"github.com/google/go-github/v33/github"
	"github.com/schollz/progressbar/v3"

	"github.com/api7/contributor-graph/api/internal/ghapi"
	"github.com/api7/contributor-graph/api/internal/graph"
	"github.com/api7/contributor-graph/api/internal/utils"
)

// if repoInput is not empty, fetch single repo and store it in db
// else, use repo list to do daily update for all repos
func UpdateDB(repoInput string, token string) ([]*utils.ConList, int, error) {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	dbCli, err := datastore.NewClient(ctx, utils.ProjectID)
	if err != nil {
		return nil, http.StatusInternalServerError, fmt.Errorf("Failed to create client: %v", err)
	}
	defer dbCli.Close()

	var repos []string
	if repoInput == "" {
		repos, err = getUpdateRepoList(ctx, dbCli)
		if err != nil {
			return nil, http.StatusInternalServerError, err
		}
	} else {
		repos = []string{strings.ToLower(repoInput)}
	}

	var conLists []*utils.ConList
	for i, repoName := range repos {
		fmt.Println(repoName)
		conLists = []*utils.ConList{}

		var ghToken string
		var isSearch bool
		if repoInput == "" {
			ghToken = utils.UpdateToken[i%len(utils.UpdateToken)]
			isSearch = false
		} else {
			ghToken = token
			isSearch = true
		}
		ghCli := ghapi.GetGithubClient(ctx, ghToken)

		lastModifiedTimeDB, err := getConFromDB(ctx, dbCli, repoName)
		if err != nil {
			return nil, http.StatusInternalServerError, err
		}

		_, err = dbCli.GetAll(ctx, datastore.NewQuery(repoName), &conLists)
		if err != nil {
			return nil, http.StatusInternalServerError, err
		}

		sort.SliceStable(conLists, func(i, j int) bool {
			return conLists[i].Date.Before(conLists[j].Date)
		})

		// No need to do instant update for recent cached repo
		// TODO: add argument `force` to force update
		if lastModifiedTimeDB.Add(23*time.Hour + 30*time.Minute).After(time.Now()) {
			fmt.Printf("Repo no need to update since recently update at %v\n", lastModifiedTimeDB)
		} else {
			conMap := make(map[string]time.Time)
			for _, c := range conLists {
				conMap[c.Author] = c.Date
			}

			// get last page
			lastPage := 0
			listCommitOpts := &github.CommitsListOptions{Since: lastModifiedTimeDB, ListOptions: ghapi.ListOpts}
			_, resp, statusCode, err := ghapi.GetCommits(ctx, ghCli, repoName, listCommitOpts, isSearch)
			if err != nil {
				return nil, statusCode, err
			}
			if resp.LastPage != 0 {
				lastPage = resp.LastPage
			}

			newConLists, code, err := updateContributorList(ctx, dbCli, ghCli, conMap, repoName, lastPage, listCommitOpts, isSearch)
			if err != nil {
				return nil, code, err
			}
			conLists = append(conLists, newConLists...)

			updateFlag := repoInput == ""
			if err := updateRepoList(ctx, dbCli, repoName, len(conLists), updateFlag); err != nil {
				return nil, http.StatusInternalServerError, err
			}

			if repoInput == "" {
				if err := graph.GenerateAndSaveSVG(ctx, repoName); err != nil {
					return nil, http.StatusInternalServerError, err
				}
			}
		}
	}

	return conLists, http.StatusOK, nil
}

func SingleCon(repoInput string, token string) ([]utils.ReturnCon, int, error) {
	conLists, code, err := UpdateDB(repoInput, token)
	if err != nil {
		return nil, code, err
	}
	formattedCons, code, err := ghapi.FormatCommits(context.Background(), conLists)
	if err != nil {
		return nil, code, err
	}

	return formattedCons, http.StatusOK, nil
}

func MultiCon(repoInput string) ([]utils.ReturnCon, int, error) {
	repos := strings.Split(repoInput, ",")
	conMap := make(map[string]time.Time)

	for _, r := range repos {
		conLists, code, err := UpdateDB(r, "")
		if err != nil {
			return nil, code, err
		}
		for _, c := range conLists {
			t, ok := conMap[c.Author]
			if !ok || t.After(c.Date) {
				conMap[c.Author] = c.Date
			}
		}
	}

	conLists := []*utils.ConList{}
	for name, time := range conMap {
		conLists = append(conLists, &utils.ConList{name, time})
	}

	formattedCons, code, err := ghapi.FormatCommits(context.Background(), conLists)
	if err != nil {
		return nil, code, err
	}

	return formattedCons, http.StatusOK, nil
}

func getConFromDB(ctx context.Context, cli *datastore.Client, repoName string) (time.Time, error) {
	repoKey := datastore.NameKey("Repo", repoName, nil)
	repoNum := utils.RepoNum{}
	if err := cli.Get(ctx, repoKey, &repoNum); err != nil {
		if err == datastore.ErrNoSuchEntity {
			return time.Time{}, nil
		}
		return time.Time{}, err
	}
	return repoNum.LastModifiedTime, nil
}

func updateContributorList(
	ctx context.Context,
	dbCli *datastore.Client,
	ghCli *github.Client,
	conMap map[string]time.Time,
	repoName string,
	lastPage int,
	listCommitOpts *github.CommitsListOptions,
	isSearch bool,
) ([]*utils.ConList, int, error) {
	bar := progressbar.Default(int64(lastPage + 1))

	var commitLists []*utils.ConList
	for i := lastPage; i >= 0; i-- {
		listCommitOpts.Page = i
		commits, _, statusCode, err := ghapi.GetCommits(ctx, ghCli, repoName, listCommitOpts, isSearch)
		if err != nil {
			return nil, statusCode, err
		}
		for j := len(commits) - 1; j >= 0; j-- {
			if commits[j].GetAuthor() != nil {
				commitAuthor := commits[j].GetAuthor().GetLogin()
				commitTime := commits[j].GetCommit().GetAuthor().GetDate()
				if _, ok := conMap[commitAuthor]; !ok {
					conMap[commitAuthor] = commitTime
					commitLists = append(commitLists, &utils.ConList{commitAuthor, commitTime})
				}
			}
		}
		bar.Add(1)
	}

	// at most write 500 entities in a single call
	rangeMax := 500
	rangeNeeded := int(math.Ceil(float64(len(commitLists)) / float64(rangeMax)))
	for i := 0; i < rangeNeeded; i++ {
		tmpList := commitLists[i*rangeMax : minInt((i+1)*rangeMax, len(commitLists))]
		keys := make([]*datastore.Key, len(tmpList))
		for i, c := range tmpList {
			keys[i] = datastore.NameKey(repoName, c.Author, utils.ConParentKey)
		}

		if _, err := dbCli.PutMulti(ctx, keys, tmpList); err != nil {
			return nil, http.StatusInternalServerError, err
		}
	}

	return commitLists, http.StatusOK, nil
}

func updateRepoList(ctx context.Context, dbCli *datastore.Client, repoName string, conNumGH int, updateFlag bool) error {
	updatedRepo := &utils.RepoNum{conNumGH, time.Now()}
	key := datastore.NameKey("Repo", repoName, nil)
	if _, err := dbCli.Put(ctx, key, updatedRepo); err != nil {
		return err
	}
	// currently update all, not only the list maintained by ourselves
	/*
		if updateFlag {
			key = datastore.NameKey("RepoUpdate", repoName, nil)
			if _, err := dbCli.Put(ctx, key, updatedRepo); err != nil {
				return err
			}
		}
	*/
	return nil
}

func GetRepoList() ([]string, int, error) {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	dbCli, err := datastore.NewClient(ctx, utils.ProjectID)
	if err != nil {
		return nil, http.StatusInternalServerError, fmt.Errorf("Failed to create client: %v", err)
	}
	defer dbCli.Close()

	keys, err := dbCli.GetAll(ctx, datastore.NewQuery("Repo").KeysOnly(), nil)
	if err != nil {
		return nil, http.StatusInternalServerError, err
	}

	repos := make([]string, len(keys))
	for i := range keys {
		repos[i] = keys[i].Name
	}

	return repos, http.StatusOK, nil
}

func getUpdateRepoList(ctx context.Context, dbCli *datastore.Client) ([]string, error) {
	var repoReturn []string
	repoMap := make(map[string]bool)

	// get update list from DB, to filter out recent updated ones in one step
	var repoLists []*utils.RepoNum

	// since right now we do not have much repos other than us, it might be a good idea to update them all
	// keys, err := dbCli.GetAll(ctx, datastore.NewQuery("RepoUpdate"), &repoLists)
	keys, err := dbCli.GetAll(ctx, datastore.NewQuery("Repo"), &repoLists)
	if err != nil {
		return nil, err
	}

	for i, r := range repoLists {
		repoName := keys[i].Name
		repoMap[repoName] = true
		if r.LastModifiedTime.Add(23*time.Hour + 30*time.Minute).Before(time.Now()) {
			repoReturn = append(repoReturn, repoName)
		}
	}

	// get update list from local list
	fileContent, err := ioutil.ReadFile(utils.RepoPath)
	if err != nil {
		return nil, err
	}
	repoListAll := strings.Split(string(fileContent), "\n")

	for _, r := range repoListAll {
		if r == "" || r[0] == '#' {
			continue
		}
		repoName := strings.ToLower(r)
		if _, ok := repoMap[repoName]; !ok {
			repoReturn = append(repoReturn, repoName)
		}
	}

	return repoReturn, nil
}

func minInt(x, y int) int {
	if x < y {
		return x
	}
	return y
}
