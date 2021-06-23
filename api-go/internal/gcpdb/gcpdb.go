package gcpdb

import (
	"context"
	"fmt"
	"io/ioutil"
	"math"
	"net/http"
	"sort"
	"strings"
	"sync"
	"time"

	"cloud.google.com/go/datastore"
	"github.com/google/go-github/v33/github"
	"github.com/schollz/progressbar/v3"
	"gopkg.in/yaml.v2"

	"github.com/api7/contributor-graph/api/internal/ghapi"
	"github.com/api7/contributor-graph/api/internal/graph"
	"github.com/api7/contributor-graph/api/internal/utils"
)

// if repoInput is not empty, fetch single repo and store it in db
// else, use repo list to do daily update for all repos
func UpdateDB(repoInput string) ([]*utils.ConList, int, error) {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	dbCli, err := datastore.NewClient(ctx, utils.ProjectID)
	if err != nil {
		return nil, http.StatusInternalServerError, fmt.Errorf("Failed to create client: %v", err)
	}
	defer dbCli.Close()

	tokens, err := GetTokens(dbCli)
	if err != nil {
		return nil, http.StatusInternalServerError, err
	}

	var repos []string
	var isSearch bool
	if repoInput == "" {
		repos, err = getUpdateRepoList(ctx, dbCli)
		if err != nil {
			return nil, http.StatusInternalServerError, err
		}
	} else {
		repos = []string{strings.ToLower(repoInput)}
		isSearch = true
	}

	var conLists []*utils.ConList
	for i, repoName := range repos {
		fmt.Println(repoName)
		conLists = []*utils.ConList{}

		var ghToken string
		if repoInput == "" {
			ghToken = tokens[i%len(tokens)].Token
		} else {
			ghToken = tokens[0].Token
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
			lastCommits, resp, statusCode, err := ghapi.GetCommits(ctx, ghCli, repoName, listCommitOpts)
			if err != nil {
				return nil, statusCode, err
			}
			if len(lastCommits) != 0 {
				if resp.LastPage != 0 {
					lastPage = resp.LastPage
				}

				var code int
				conLists, code, err = updateContributorList(ctx, dbCli, ghCli, conMap, repoName, lastPage, listCommitOpts, isSearch)
				if err != nil {
					return nil, code, err
				}

				if repoInput == "" {
					merge := false
					if _, err := graph.GenerateAndSaveSVG(ctx, repoName, merge, utils.ContributorOverTime); err != nil {
						return nil, http.StatusInternalServerError, err
					}
				}
			}
			updateFlag := repoInput == ""
			if err := UpdateRepoList(ctx, dbCli, repoName, len(conLists), updateFlag); err != nil {
				return nil, http.StatusInternalServerError, err
			}

		}
	}

	return conLists, http.StatusOK, nil
}

func SingleCon(repoInput string) ([]utils.ReturnCon, int, error) {
	conLists, code, err := UpdateDB(repoInput)
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
	conMap := make(map[string]time.Time)

	if strings.Contains(repoInput, ",") {
		repos := strings.Split(repoInput, ",")
		if code, err := getConFromMultiRepo(conMap, repos); err != nil {
			return nil, code, err
		}
	} else {
		// if repoInput only contains one repo, use our own list
		var repoList map[string][]string
		if err := ReadMultiRepoYaml(&repoList); err != nil {
			return nil, http.StatusInternalServerError, err
		}

		if repos, ok := repoList[repoInput]; !ok {
			return nil, http.StatusNotFound, fmt.Errorf("Not supported, please file a issue/PR in github.com/api7/contributor-graph to include your repo list in")
		} else {
			if code, err := getConFromMultiRepo(conMap, repos); err != nil {
				return nil, code, err
			}
		}
	}

	conLists := []*utils.ConList{}
	for name, time := range conMap {
		conLists = append(conLists, &utils.ConList{name, time})
	}

	sort.SliceStable(conLists, func(i, j int) bool {
		return conLists[i].Date.Before(conLists[j].Date)
	})

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
	var commitLists []*utils.ConList
	bar := progressbar.Default(int64(lastPage + 1))

	parallelLimit := 1
	if isSearch {
		parallelLimit = 100
	}

	errCh := make(chan utils.ErrorWithCode, lastPage+1)
	comList := make([]*[]*github.RepositoryCommit, lastPage+1)

	var wg sync.WaitGroup
	guard := make(chan int, parallelLimit)
	for i := lastPage; i >= 0; i-- {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			guard <- 1
			// could not directly pass listCommitOpts since `Page` would be changed in different goroutine
			optsGoroutine := *listCommitOpts
			optsGoroutine.Page = i
			commits, _, statusCode, err := ghapi.GetCommits(ctx, ghCli, repoName, &optsGoroutine)
			if err != nil {
				errCh <- utils.ErrorWithCode{err, statusCode}
				return
			}
			comList[i] = &commits
			bar.Add(1)
			<-guard
		}(i)
	}
	wg.Wait()

	close(errCh)

	for err := range errCh {
		if _, ok := err.Err.(*github.RateLimitError); ok {
			return nil, http.StatusForbidden, fmt.Errorf("Hit rate limit")
		} else {
			return nil, err.Code, err.Err
		}
	}
	for i := range comList {
		commits := *comList[len(comList)-i-1]
		for j := len(commits) - 1; j >= 0; j-- {
			if commits[j].GetAuthor() != nil {
				commitAuthor := commits[j].GetAuthor().GetLogin()
				commitTime := commits[j].GetCommit().GetAuthor().GetDate()
				if _, ok := conMap[commitAuthor]; !ok {
					conMap[commitAuthor] = commitTime
				}
			}
		}
	}
	for name, time := range conMap {
		commitLists = append(commitLists, &utils.ConList{name, time})
	}

	sort.SliceStable(commitLists, func(i, j int) bool {
		return commitLists[i].Date.Before(commitLists[j].Date)
	})

	if err := PutMultiWithLimit(ctx, dbCli, repoName, commitLists); err != nil {
		return nil, http.StatusInternalServerError, err
	}

	return commitLists, http.StatusOK, nil
}

func PutMultiWithLimit(ctx context.Context, dbCli *datastore.Client, repoName string, conLists []*utils.ConList) error {
	// at most write 500 entities in a single call
	rangeMax := 500
	rangeNeeded := int(math.Ceil(float64(len(conLists)) / float64(rangeMax)))
	for i := 0; i < rangeNeeded; i++ {
		tmpList := conLists[i*rangeMax : MinInt((i+1)*rangeMax, len(conLists))]
		keys := make([]*datastore.Key, len(tmpList))
		for i, c := range tmpList {
			keys[i] = datastore.NameKey(repoName, c.Author, utils.ConParentKey)
		}

		if _, err := dbCli.PutMulti(ctx, keys, tmpList); err != nil {
			return err
		}
	}
	return nil
}

func UpdateRepoList(ctx context.Context, dbCli *datastore.Client, repoName string, conNumGH int, updateFlag bool) error {
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

// Currently for manually add anonymous contributors due to repo's request
// Not a good idea to expose it as API or it would ruin datastore
func AddAnonCon(ctx context.Context, ghcli *github.Client, dbCli *datastore.Client, repoName string) {
	anonCon, _, err := ghapi.GetAnonCon(ctx, ghcli, repoName)
	if err != nil {
		panic(err)
	}
	var conLists []*utils.ConList
	for i, c := range anonCon {
		listCommitOpts := &github.CommitsListOptions{Author: c}
		comList, _, _, err := ghapi.GetCommits(ctx, ghcli, repoName, listCommitOpts)
		if err != nil {
			panic(err)
		}
		firstCommitTime := comList[len(comList)-1].GetCommit().GetAuthor().GetDate()
		conLists = append(conLists, &utils.ConList{c, firstCommitTime})
		fmt.Println(i, utils.ConList{c, firstCommitTime})
	}
	keys := make([]*datastore.Key, len(conLists))
	for i, c := range conLists {
		keys[i] = datastore.NameKey(repoName, c.Author, utils.ConParentKey)
	}

	if _, err := dbCli.PutMulti(ctx, keys, conLists); err != nil {
		panic(err)
	}
	panic("Successfully add anonymous contributors. STOP here.")
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

func MinInt(x, y int) int {
	if x < y {
		return x
	}
	return y
}

func ReadMultiRepoYaml(repoList *map[string][]string) error {
	yamlFile, err := ioutil.ReadFile(utils.MultiRepoPath)
	if err != nil {
		return err
	}
	err = yaml.Unmarshal(yamlFile, &repoList)
	if err != nil {
		return err
	}
	return nil
}

func getConFromMultiRepo(conMap map[string]time.Time, repos []string) (int, error) {
	for _, r := range repos {
		conLists, code, err := UpdateDB(r)
		if err != nil {
			return code, err
		}
		for _, c := range conLists {
			t, ok := conMap[c.Author]
			if !ok || t.After(c.Date) {
				conMap[c.Author] = c.Date
			}
		}
	}
	return http.StatusOK, nil
}

func GetTokens(dbCli *datastore.Client) ([]*utils.Token, error) {
	ctx := context.Background()
	if dbCli == nil {
		dbCli, err := datastore.NewClient(ctx, utils.ProjectID)
		if err != nil {
			return nil, fmt.Errorf("Failed to create client: %v", err)
		}
		defer dbCli.Close()
	}
	tokens := []*utils.Token{}
	_, err := dbCli.GetAll(ctx, datastore.NewQuery("token"), &tokens)
	if err != nil {
		return nil, err
	}
	return tokens, nil
}
