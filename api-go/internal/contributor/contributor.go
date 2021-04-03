package contributor

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"time"

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

func GetContributorMonthly(repoName string) ([]utils.MonthlyConList, int, error) {
	owner, repo, err := ghapi.SplitRepo(repoName)
	if err != nil {
		return nil, http.StatusNotFound, fmt.Errorf("Repo format error")
	}

	ctx := context.Background()
	ghCli := ghapi.GetGithubClient(ctx, utils.Token)

	// get first commit of the repo and use it as the start
	listCommitOpts := &github.CommitsListOptions{}
	commits, resp, err := ghCli.Repositories.ListCommits(ctx, owner, repo, listCommitOpts)
	if err != nil {
		return nil, http.StatusInternalServerError, err
	}
	if resp.NextPage != 0 {
		listCommitOpts.Page = resp.LastPage
		commits, resp, err = ghCli.Repositories.ListCommits(ctx, owner, repo, listCommitOpts)
		if err != nil {
			return nil, http.StatusInternalServerError, err
		}
	}

	firstCommitTime := commits[len(commits)-1].Commit.Author.Date

	year, month, _ := firstCommitTime.Date()
	loc := firstCommitTime.Location()

	//try to filter commits of each month
	firstDay := time.Date(year, month, 1, 0, 0, 0, 0, loc)

	var monthlyConLists []utils.MonthlyConList

	for {
		// no need to get data for current month, since it would affect how the graph curve goes
		if firstDay.AddDate(0, 1, 0).After(time.Now()) {
			break
		}
		fmt.Println(firstDay.String())

		comLists := make(map[string]bool)
		listCommitOpts := &github.CommitsListOptions{Since: firstDay, Until: firstDay.AddDate(0, 1, 0), ListOptions: listOpts}
		for {
			coms, resp, err := ghCli.Repositories.ListCommits(ctx, owner, repo, listCommitOpts)
			if err != nil {
				if strings.Contains(err.Error(), "404 Not Found") {
					return nil, http.StatusNotFound, fmt.Errorf("Repo not found")
				}
				if _, ok := err.(*github.RateLimitError); ok {
					return nil, http.StatusForbidden, fmt.Errorf("Hit rate limit")
				}
				return nil, http.StatusInternalServerError, err
			}
			for _, c := range coms {
				comLists[c.Author.GetLogin()] = true
			}
			if resp.NextPage == 0 {
				break
			}
			listCommitOpts.Page = resp.NextPage
		}
		monthlyConLists = append(monthlyConLists, utils.MonthlyConList{firstDay, len(comLists)})

		firstDay = firstDay.AddDate(0, 1, 0)
	}

	return monthlyConLists, http.StatusOK, nil
}
