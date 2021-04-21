package contributor

import (
	"context"
	"fmt"
	"io/ioutil"
	"net/http"
	"sort"
	"strings"
	"sync"
	"time"

	"cloud.google.com/go/datastore"
	"github.com/google/go-github/v33/github"
	"github.com/schollz/progressbar/v3"

	"github.com/api7/contributor-graph/api/internal/gcpdb"
	"github.com/api7/contributor-graph/api/internal/ghapi"
	"github.com/api7/contributor-graph/api/internal/utils"
)

func GetContributorList(repoName string, token string) ([]utils.ReturnCon, int, error) {
	_, _, err := ghapi.SplitRepo(repoName)
	if err != nil {
		return nil, http.StatusNotFound, fmt.Errorf("Repo format error")
	}

	fmt.Printf("New request coming with %s\n", repoName)
	returnCons, code, err := gcpdb.SingleCon(repoName, token)
	if err != nil {
		return nil, code, err
	}

	return returnCons, http.StatusOK, nil
}

func GetContributorMonthly(repoInput string, token string) ([]utils.MonthlyConList, int, error) {
	ctx := context.Background()

	dbCli, err := datastore.NewClient(ctx, utils.ProjectID)
	if err != nil {
		return nil, http.StatusInternalServerError, fmt.Errorf("Failed to create client: %v", err)
	}
	defer dbCli.Close()

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

	for i, repoName := range repos {
		fmt.Println(repoName)

		var monthlyConLists []*utils.MonthlyConList
		_, err = dbCli.GetAll(ctx, datastore.NewQuery("Monthly-"+repoName), &monthlyConLists)
		if err != nil {
			if err != datastore.ErrInvalidEntityType {
				return nil, http.StatusInternalServerError, err
			}
		}

		sort.SliceStable(monthlyConLists, func(i, j int) bool {
			return monthlyConLists[i].Month.Before(monthlyConLists[j].Month)
		})

		if len(monthlyConLists) == 0 || monthlyConLists[len(monthlyConLists)-1].Month.AddDate(0, 2, 0).Before(time.Now()) {
			var ghToken string
			if repoInput == "" {
				ghToken = utils.UpdateToken[i%len(utils.UpdateToken)]
			} else {
				ghToken = token
			}

			ghCli := ghapi.GetGithubClient(ctx, ghToken)

			var firstDay time.Time
			if len(monthlyConLists) > 0 {
				firstDay = monthlyConLists[len(monthlyConLists)-1].Month.AddDate(0, 1, 0)
			} else {
				// get first commit of the repo and use it as the start
				var code int
				firstDay, code, err = ghapi.GetFirstCommit(ctx, ghCli, repoName, isSearch)
				if err != nil {
					return nil, code, err
				}
			}

			var monthList []time.Time
			for {
				// no need to get data for current month, since it would affect how the graph curve goes
				if firstDay.AddDate(0, 1, 0).After(time.Now()) {
					break
				}
				monthList = append(monthList, firstDay)
				firstDay = firstDay.AddDate(0, 1, 0)
			}

			newMonthlyConLists := make([]*utils.MonthlyConList, len(monthList))
			bar := progressbar.Default(int64(len(monthList)))

			parallelLimit := 1
			if isSearch {
				parallelLimit = 100
			}

			var wg sync.WaitGroup
			errCh := make(chan utils.ErrorWithCode, len(monthList))
			guard := make(chan int, parallelLimit)

			for i := range monthList {
				wg.Add(1)
				go func(i int) {
					defer wg.Done()
					guard <- 1

					comLists := make(map[string]bool)
					sinceDay := monthList[i]
					untilDay := sinceDay.AddDate(0, 1, 0)
					listCommitOpts := &github.CommitsListOptions{Since: sinceDay, Until: untilDay, ListOptions: ghapi.ListOpts}
					for {
						commits, resp, statusCode, err := ghapi.GetCommits(ctx, ghCli, repoName, listCommitOpts, isSearch)
						if err != nil {
							errCh <- utils.ErrorWithCode{err, statusCode}
							return
						}
						for _, c := range commits {
							if c.Author != nil {
								comLists[c.Author.GetLogin()] = true
							}
						}
						if resp.NextPage == 0 {
							break
						}
						listCommitOpts.Page = resp.NextPage
					}

					newMonthlyConLists[i] = &utils.MonthlyConList{sinceDay, len(comLists)}
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

			keys := make([]*datastore.Key, len(newMonthlyConLists))
			for i, c := range newMonthlyConLists {
				keys[i] = datastore.NameKey("Monthly-"+repoName, c.Month.String(), nil)
			}

			if _, err := dbCli.PutMulti(ctx, keys, newMonthlyConLists); err != nil {
				return nil, http.StatusInternalServerError, err
			}

			key := datastore.NameKey("Monthly-Repo", repoName, nil)
			if _, err := dbCli.Put(ctx, key, &utils.LastModifiedTime{time.Now()}); err != nil {
				return nil, http.StatusInternalServerError, err
			}

			monthlyConLists = append(monthlyConLists, newMonthlyConLists...)
		}

		retMonthlyConLists := make([]utils.MonthlyConList, len(monthlyConLists))
		for i := range monthlyConLists {
			retMonthlyConLists[i] = *monthlyConLists[i]
		}

		if repoInput != "" {
			return retMonthlyConLists, http.StatusOK, nil
		}
	}
	return nil, http.StatusOK, nil
}

func getUpdateRepoList(ctx context.Context, dbCli *datastore.Client) ([]string, error) {
	var repoReturn []string
	repoMap := make(map[string]bool)

	// get update list from DB, to filter out recent updated ones in one step
	var timeLists []*utils.LastModifiedTime
	keys, err := dbCli.GetAll(ctx, datastore.NewQuery("Monthly-Repo"), &timeLists)
	if err != nil {
		return nil, err
	}

	for i, t := range timeLists {
		repoName := keys[i].Name
		repoMap[repoName] = true
		if t.LastModifiedTime.AddDate(0, 1, 0).Before(time.Now()) {
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
