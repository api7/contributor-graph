package contributor

import (
	"context"
	"fmt"
	"io/ioutil"
	"math/rand"
	"net/http"
	"sort"
	"strings"
	"time"

	"cloud.google.com/go/datastore"
	"github.com/google/go-github/v33/github"

	"github.com/api7/contributor-graph/api/internal/gcpdb"
	"github.com/api7/contributor-graph/api/internal/ghapi"
	"github.com/api7/contributor-graph/api/internal/utils"
)

var (
	listOpts = github.ListOptions{PerPage: 100}
)

func GetContributorList(repoName string) ([]utils.ReturnCon, int, error) {
	_, _, err := ghapi.SplitRepo(repoName)
	if err != nil {
		return nil, http.StatusNotFound, fmt.Errorf("Repo format error")
	}

	fmt.Printf("New request coming with %s\n", repoName)
	returnCons, code, err := gcpdb.UpdateDB(repoName)
	if err != nil {
		return nil, code, err
	}

	return returnCons, http.StatusOK, nil
}

func GetContributorMonthly(repoInput string) ([]utils.MonthlyConList, int, error) {
	ctx := context.Background()

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

	for i, repoName := range repos {
		fmt.Println(repoName)
		owner, repo, err := ghapi.SplitRepo(repoName)
		if err != nil {
			return nil, http.StatusNotFound, fmt.Errorf("Repo format error: %s", repoName)
		}

		var monthlyConLists []*utils.MonthlyConList
		keys, err := dbCli.GetAll(ctx, datastore.NewQuery("Monthly-"+repoName), &monthlyConLists)
		if err != nil {
			if err != datastore.ErrInvalidEntityType {
				return nil, http.StatusInternalServerError, err
			}
		}

		sort.SliceStable(monthlyConLists, func(i, j int) bool {
			return monthlyConLists[i].Month.Before(monthlyConLists[j].Month)
		})

		if err := dbCli.DeleteMulti(ctx, keys); err != nil {
			if err != datastore.ErrInvalidEntityType {
				return nil, http.StatusInternalServerError, err
			}
		}

		monthlyConLists = []*utils.MonthlyConList{}

		if len(monthlyConLists) == 0 || monthlyConLists[len(monthlyConLists)-1].Month.AddDate(0, 2, 0).Before(time.Now()) {
			ghCli := ghapi.GetGithubClient(ctx, utils.UpdateToken[i%len(utils.UpdateToken)])

			// get first commit of the repo and use it as the start
			listCommitOpts := &github.CommitsListOptions{}
			var firstCommitTime *time.Time
			commits, resp, statusCode, err := getCommits(ctx, ghCli, owner, repo, listCommitOpts)
			if err != nil {
				return nil, statusCode, err
			}
			if resp.NextPage != 0 {
				listCommitOpts.Page = resp.LastPage
				commits, resp, statusCode, err = getCommits(ctx, ghCli, owner, repo, listCommitOpts)
				if err != nil {
					return nil, statusCode, err
				}

				// to jump over commits with tricked date
				// don't know the reason but those author of those commits would be empty
				// example:
				//		curl -u username:$token -H "Accept: application/vnd.github.v3+json" 'https://api.github.com/repos/angular/angular.js/commits?author=git5@invalid'
				//		https://github.com/golang/go/commit/7d7c6a97f815e9279d08cfaea7d5efb5e90695a8
				// also this seems what Github is doing when presenting `insights - contributors`
				// example:
				//		the earliest commits of apache kafka happened at 2011-08-01, but it has the author `null`.
				//		So on `insights - contributors`, it says the first commit is at 2012-12-16, which is the first commit whose author is not `null`
				for i := range commits {
					if commits[len(commits)-i-1].Author != nil {
						firstCommitTime = commits[len(commits)-i-1].Commit.Author.Date
						break
					}
				}
			}

			for firstCommitTime == nil {
				listCommitOpts.Page = resp.PrevPage
				commits, resp, statusCode, err = getCommits(ctx, ghCli, owner, repo, listCommitOpts)
				if err != nil {
					return nil, statusCode, err
				}

				for i := range commits {
					if commits[len(commits)-i-1].Author != nil {
						firstCommitTime = commits[len(commits)-i-1].Commit.Author.Date
						break
					}
				}
			}

			year, month, _ := firstCommitTime.Date()
			loc := firstCommitTime.Location()

			//try to filter commits of each month
			firstDay := time.Date(year, month, 1, 0, 0, 0, 0, loc)

			var newMonthlyConLists []*utils.MonthlyConList

			for {
				// no need to get data for current month, since it would affect how the graph curve goes
				if firstDay.AddDate(0, 1, 0).After(time.Now()) {
					break
				}
				fmt.Println(repoName + " " + firstDay.String())

				comLists := make(map[string]bool)
				listCommitOpts := &github.CommitsListOptions{Since: firstDay, Until: firstDay.AddDate(0, 1, 0), ListOptions: listOpts}
				for {
					commits, resp, statusCode, err = getCommits(ctx, ghCli, owner, repo, listCommitOpts)
					if err != nil {
						return nil, statusCode, err
					}
					for _, c := range commits {
						comLists[c.Author.GetLogin()] = true
					}
					if resp.NextPage == 0 {
						break
					}
					listCommitOpts.Page = resp.NextPage
				}
				newMonthlyConLists = append(newMonthlyConLists, &utils.MonthlyConList{firstDay, len(comLists)})

				firstDay = firstDay.AddDate(0, 1, 0)
			}

			keys := make([]*datastore.Key, len(newMonthlyConLists))
			for i, c := range newMonthlyConLists {
				keys[i] = datastore.NameKey("Monthly-"+repoName, c.Month.String(), nil)
			}
			if _, err := dbCli.PutMulti(ctx, keys, newMonthlyConLists); err != nil {
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

		key := datastore.NameKey("Monthly-Repo", repoName, nil)
		if _, err := dbCli.Put(ctx, key, &utils.LastModifiedTime{time.Now()}); err != nil {
			return nil, http.StatusInternalServerError, err
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

func getCommits(ctx context.Context, ghCli *github.Client, owner string, repo string, listCommitOpts *github.CommitsListOptions) ([]*github.RepositoryCommit, *github.Response, int, error) {
	commits, resp, err := ghCli.Repositories.ListCommits(ctx, owner, repo, listCommitOpts)
	if err != nil {
		if strings.Contains(err.Error(), "404 Not Found") {
			return nil, nil, http.StatusNotFound, fmt.Errorf("Repo not found")
		}
		if _, ok := err.(*github.RateLimitError); ok || strings.Contains(err.Error(), "403 API rate limit exceeded") {
			// give it another random chance to see if magic happens
			*ghCli = *ghapi.GetGithubClient(ctx, utils.UpdateToken[rand.Intn(len(utils.UpdateToken))])
			commits, resp, err = ghCli.Repositories.ListCommits(ctx, owner, repo, listCommitOpts)
			if err != nil {
				return nil, nil, http.StatusForbidden, fmt.Errorf("Hit rate limit")
			}
			fmt.Println("MAGIC happens and let's rolling again!")
		} else {
			return nil, nil, http.StatusInternalServerError, err
		}
	}
	return commits, resp, http.StatusOK, nil
}
