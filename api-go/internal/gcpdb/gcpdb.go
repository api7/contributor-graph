package gcpdb

import (
	"context"
	"fmt"
	"io/ioutil"
	"log"
	"math"
	"net/http"
	"strings"

	"cloud.google.com/go/datastore"
	"github.com/google/go-github/v33/github"

	"github.com/api7/contributor-graph/api/internal/ghapi"
	"github.com/api7/contributor-graph/api/internal/utils"
)

// if repoInput is not empty, fetch single repo and store it in db
// else, use repo list to do daily update for all repos
func UpdateDB(dbCli *datastore.Client, repoInput string) ([]utils.ReturnCon, int, error) {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	if dbCli == nil {
		var err error
		dbCli, err = datastore.NewClient(ctx, utils.ProjectID)
		if err != nil {
			return nil, http.StatusInternalServerError, fmt.Errorf("Failed to create client: %v", err)
		}
	}
	defer dbCli.Close()

	// Refresh use its own token to do the update
	var ghToken string
	if repoInput == "" {
		ghToken = utils.UpdateToken
	} else {
		ghToken = utils.Token
	}
	ghCli := ghapi.GetGithubClient(ctx, ghToken)

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

	for _, repoName := range repos {
		if repoName == "" {
			continue
		}
		log.Println(repoName)

		conGH, code, err := getContributorsNumFromGH(ctx, ghCli, repoName)
		if err != nil {
			return nil, code, err
		}
		conNumGH := len(conGH)

		conNumDB, err := getContributorsNumFromDB(ctx, dbCli, repoName)
		if err != nil {
			return nil, http.StatusInternalServerError, err
		}

		var conLists []*utils.ConList
		if _, err = dbCli.GetAll(ctx, datastore.NewQuery(repoName).Order("Date"), &conLists); err != nil {
			return nil, http.StatusInternalServerError, err
		}

		if conNumDB == conNumGH {
			log.Printf("Repo no need to update with contributor number %d\n", conNumDB)
		} else {
			log.Printf("Repo %s need to update from %d to %d\n", repoName, conNumDB, conNumGH)

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

		if repoInput != "" {
			formattedCons, code, err := ghapi.FormatCommits(ctx, conLists)
			if err != nil {
				return nil, code, err
			}

			returnCons := make([]utils.ReturnCon, len(formattedCons))
			for i, c := range formattedCons {
				returnCons[i] = *c
				log.Printf("%#v\n", *c)
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

func getContributorsNumFromDB(ctx context.Context, cli *datastore.Client, repoName string) (int, error) {
	repoKey := datastore.NameKey("Repo", repoName, nil)
	repoNum := utils.RepoNum{}
	if err := cli.Get(ctx, repoKey, &repoNum); err != nil {
		if err == datastore.ErrNoSuchEntity {
			return 0, nil
		}
		return 0, err
	}
	return repoNum.Num, nil
}

func updateContributorList(ctx context.Context, dbCli *datastore.Client, ghCli *github.Client, repoName string, newCons []utils.ConGH, maxConcurrency int) ([]*utils.ConList, int, error) {
	commitListsAll, code, err := ghapi.GetCommits(ctx, ghCli, repoName, newCons, maxConcurrency)
	if err != nil {
		return nil, code, err
	}

	// at most write 500 entities in a single call
	rangeMax := 500
	rangeNeeded := int(math.Ceil(float64(len(commitListsAll)) / float64(rangeMax)))
	for i := 0; i < rangeNeeded; i++ {
		commitLists := commitListsAll[i*rangeMax : minInt((i+1)*rangeMax, len(commitListsAll))]
		keys := make([]*datastore.Key, len(commitLists))
		for i, c := range commitLists {
			keys[i] = datastore.NameKey(repoName, c.Author, utils.ConParentKey)
		}

		if _, err := dbCli.PutMulti(ctx, keys, commitLists); err != nil {
			return nil, http.StatusInternalServerError, err
		}
	}

	return commitListsAll, http.StatusOK, nil
}

func updateRepoList(ctx context.Context, dbCli *datastore.Client, repoName string, conNumGH int) error {
	updatedRepo := &utils.RepoNum{conNumGH}
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
