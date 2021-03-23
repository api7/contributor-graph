package gcpdb

import (
	"context"
	"fmt"
	"io/ioutil"
	"math"
	"net/http"
	"strings"
	"time"

	"cloud.google.com/go/datastore"
	"github.com/google/go-github/v33/github"

	"github.com/api7/contributor-graph/api/internal/ghapi"
	"github.com/api7/contributor-graph/api/internal/utils"
)

// if repoInput is not empty, fetch single repo and store it in db
// else, use repo list to do daily update for all repos
func UpdateDB(repoInput string) ([]utils.ReturnCon, int, error) {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	dbCli, err := datastore.NewClient(ctx, utils.ProjectID)
	if err != nil {
		return nil, http.StatusInternalServerError, fmt.Errorf("Failed to create client: %v", err)
	}
	defer dbCli.Close()

	var repos []string
	if repoInput == "" {
		fileContent, err := ioutil.ReadFile(utils.RepoPath)
		if err != nil {
			return nil, http.StatusInternalServerError, err
		}
		repos = strings.Split(string(fileContent), "\n")
	} else {
		repos = []string{repoInput}
	}

	for i, repoName := range repos {
		var ghToken string
		if repoInput == "" {
			ghToken = utils.UpdateToken[i%len(utils.UpdateToken)]
		} else {
			ghToken = utils.Token
		}
		ghCli := ghapi.GetGithubClient(ctx, ghToken)

		if repoName == "" {
			continue
		}
		fmt.Println(repoName)

		conNumDB, lastModifiedTimeDB, err := getContributorsNumFromDB(ctx, dbCli, repoName)
		if err != nil {
			return nil, http.StatusInternalServerError, err
		}

		var conLists []*utils.ConList
		if _, err = dbCli.GetAll(ctx, datastore.NewQuery(repoName).Order("Date"), &conLists); err != nil {
			return nil, http.StatusInternalServerError, err
		}

		// No need to do instant update for recent cached repo
		// TODO: add argument `force` to force update
		if lastModifiedTimeDB.Add(23 * time.Hour).After(time.Now()) {
			fmt.Printf("Repo no need to update since recently update at %v\n", lastModifiedTimeDB)
		} else {
			conGH, code, err := getContributorsNumFromGH(ctx, ghCli, repoName)
			if err != nil {
				return nil, code, err
			}
			conNumGH := len(conGH)

			if conNumDB == conNumGH {
				fmt.Printf("Repo no need to update with contributor number %d\n", conNumDB)
				// to update LastModifiedTime
				if err := updateRepoList(ctx, dbCli, repoName, conNumGH); err != nil {
					return nil, http.StatusInternalServerError, err
				}
			} else {
				fmt.Printf("Repo %s need to update from %d to %d\n", repoName, conNumDB, conNumGH)

				conExists := make(map[string]bool)

				for _, c := range conLists {
					conExists[c.Author] = true
				}
				var newCons []utils.ConGH
				for _, c := range conGH {
					if _, ok := conExists[c.Author]; !ok {
						if _, ok := conExists[c.Email]; !ok {
							newCons = append(newCons, c)
						}
					}
				}

				var maxConcurrency int
				if repoInput == "" {
					maxConcurrency = utils.UpdateLimit
				}
				newConLists, code, err := updateContributorList(ctx, dbCli, ghCli, repoName, newCons, maxConcurrency)
				if err != nil {
					return nil, code, err
				}

				if err := updateRepoList(ctx, dbCli, repoName, conNumGH); err != nil {
					return nil, http.StatusInternalServerError, err
				}

				conLists = append(conLists, newConLists...)
			}
		}

		if repoInput != "" {
			formattedCons, code, err := ghapi.FormatCommits(ctx, conLists)
			if err != nil {
				return nil, code, err
			}

			returnCons := make([]utils.ReturnCon, len(formattedCons))
			for i, c := range formattedCons {
				returnCons[i] = *c
				fmt.Printf("%#v\n", *c)
			}
			return returnCons, http.StatusOK, nil
		}
	}

	return nil, http.StatusOK, nil
}

func getContributorsNumFromGH(ctx context.Context, ghCli *github.Client, repoName string) ([]utils.ConGH, int, error) {
	cons, code, err := ghapi.GetContributors(ctx, ghCli, repoName)
	if err != nil {
		return nil, code, err
	}

	return cons, http.StatusOK, err
}

func getContributorsNumFromDB(ctx context.Context, cli *datastore.Client, repoName string) (int, time.Time, error) {
	repoKey := datastore.NameKey("Repo", repoName, nil)
	repoNum := utils.RepoNum{}
	if err := cli.Get(ctx, repoKey, &repoNum); err != nil {
		if err == datastore.ErrNoSuchEntity {
			return 0, time.Time{}, nil
		}
		return 0, time.Time{}, err
	}
	return repoNum.Num, repoNum.LastModifiedTime, nil
}

func updateContributorList(ctx context.Context, dbCli *datastore.Client, ghCli *github.Client, repoName string, newConsAll []utils.ConGH, maxConcurrency int) ([]*utils.ConList, int, error) {
	// at most write 500 entities in a single call
	var commitListsAll []*utils.ConList
	rangeMax := 500
	rangeNeeded := int(math.Ceil(float64(len(newConsAll)) / float64(rangeMax)))
	for i := 0; i < rangeNeeded; i++ {
		newCons := newConsAll[i*rangeMax : minInt((i+1)*rangeMax, len(newConsAll))]

		commitLists, code, err := ghapi.GetCommits(ctx, ghCli, repoName, newCons, maxConcurrency)
		if err != nil {
			return nil, code, err
		}

		keys := make([]*datastore.Key, len(commitLists))
		for i, c := range commitLists {
			keys[i] = datastore.NameKey(repoName, c.Author, utils.ConParentKey)
		}

		if _, err := dbCli.PutMulti(ctx, keys, commitLists); err != nil {
			return nil, http.StatusInternalServerError, err
		}
		commitListsAll = append(commitListsAll, commitLists...)
	}

	return commitListsAll, http.StatusOK, nil
}

func updateRepoList(ctx context.Context, dbCli *datastore.Client, repoName string, conNumGH int) error {
	updatedRepo := &utils.RepoNum{conNumGH, time.Now()}
	key := datastore.NameKey("Repo", repoName, nil)
	if _, err := dbCli.Put(ctx, key, updatedRepo); err != nil {
		return err
	}

	return nil
}

func minInt(x, y int) int {
	if x < y {
		return x
	}
	return y
}
