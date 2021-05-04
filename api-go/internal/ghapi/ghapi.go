package ghapi

import (
	"context"
	"fmt"
	"math/rand"
	"net/http"
	"strings"
	"time"

	"github.com/google/go-github/v33/github"
	"golang.org/x/oauth2"

	"github.com/api7/contributor-graph/api/internal/utils"
)

var (
	ListOpts = github.ListOptions{PerPage: 100}
)

func SplitRepo(repo string) (string, string, error) {
	strs := strings.Split(repo, "/")
	if len(strs) != 2 {
		return "", "", fmt.Errorf("Repo format error")
	}
	return strs[0], strs[1], nil
}

func GetGithubClient(ctx context.Context, token string) *github.Client {
	tc := getToken(ctx, token)

	return github.NewClient(tc)
}

func FormatCommits(ctx context.Context, comLists []*utils.ConList) ([]utils.ReturnCon, int, error) {
	var returnCons []utils.ReturnCon
	var authors []string
	var timeLast time.Time
	var numNotCount int
	for i, c := range comLists {
		if c.Date.IsZero() {
			numNotCount++
			continue
		}
		if compareSameDay(c.Date, timeLast) {
			authors = append(authors, c.Author)
		} else {
			if len(authors) > 0 {
				returnCons = append(returnCons, utils.ReturnCon{timeLast, i - numNotCount, authors})
			}
			timeLast = c.Date
			authors = []string{c.Author}
		}
	}
	returnCons = append(returnCons, utils.ReturnCon{timeLast, len(comLists) - numNotCount, authors})

	return returnCons, http.StatusOK, nil
}

func GetCommits(ctx context.Context, ghCli *github.Client, repoName string, listCommitOpts *github.CommitsListOptions) ([]*github.RepositoryCommit, *github.Response, int, error) {
	owner, repo, err := SplitRepo(repoName)
	if err != nil {
		return nil, nil, http.StatusBadRequest, err
	}

	commits, resp, err := ghCli.Repositories.ListCommits(ctx, owner, repo, listCommitOpts)
	if err != nil {
		if strings.Contains(err.Error(), "404 Not Found") {
			return nil, nil, http.StatusNotFound, fmt.Errorf("Repo not found")
		}
		if _, ok := err.(*github.RateLimitError); ok || strings.Contains(err.Error(), "403 API rate limit exceeded") {
			// give it another random chance to see if magic happens
			*ghCli = *GetGithubClient(ctx, utils.UpdateToken[rand.Intn(len(utils.UpdateToken))])
			commits, resp, err = ghCli.Repositories.ListCommits(ctx, owner, repo, listCommitOpts)
			if err != nil {
				return nil, nil, http.StatusForbidden, fmt.Errorf("Hit rate limit")
			}
			fmt.Println("MAGIC happens and let's rolling again!")
		} else {
			return nil, nil, resp.StatusCode, err
		}
	}
	return commits, resp, http.StatusOK, nil
}

func GetFirstCommit(ctx context.Context, ghCli *github.Client, repoName string) (time.Time, int, error) {
	listCommitOpts := &github.CommitsListOptions{}
	var firstCommitTime *time.Time
	commits, resp, statusCode, err := GetCommits(ctx, ghCli, repoName, listCommitOpts)
	if err != nil {
		return time.Time{}, statusCode, err
	}
	if resp.NextPage != 0 {
		listCommitOpts.Page = resp.LastPage
		commits, resp, statusCode, err = GetCommits(ctx, ghCli, repoName, listCommitOpts)
		if err != nil {
			return time.Time{}, statusCode, err
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
		commits, resp, statusCode, err = GetCommits(ctx, ghCli, repoName, listCommitOpts)
		if err != nil {
			return time.Time{}, statusCode, err
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
	// use the first second of this month as start
	return time.Date(year, month, 1, 0, 0, 0, 0, loc), http.StatusOK, nil
}

func compareSameDay(time1 time.Time, time2 time.Time) bool {
	if time1.Day() == time2.Day() && time1.Month() == time2.Month() && time1.Year() == time2.Year() {
		return true
	}
	return false
}

func getToken(ctx context.Context, token string) *http.Client {
	ts := oauth2.StaticTokenSource(
		&oauth2.Token{AccessToken: token},
	)
	tc := oauth2.NewClient(ctx, ts)

	return tc
}

func GetAnonCon(ctx context.Context, client *github.Client, repoName string) ([]string, int, error) {
	owner, repo, err := SplitRepo(repoName)
	if err != nil {
		return nil, http.StatusBadRequest, err
	}

	listConOpts := &github.ListContributorsOptions{ListOptions: ListOpts, Anon: "true"}
	var anonEmails []string
	for {
		cons, resp, err := client.Repositories.ListContributors(ctx, owner, repo, listConOpts)
		if err != nil {
			if strings.Contains(err.Error(), "404 Not Found") {
				return nil, http.StatusNotFound, fmt.Errorf("Repo not found")
			}
			return nil, http.StatusInternalServerError, err
		}
		for _, c := range cons {
			if c.Email != nil {
				anonEmails = append(anonEmails, *c.Email)
			}
		}
		if resp.NextPage == 0 {
			break
		}
		listConOpts.Page = resp.NextPage
	}
	// API seems not stable so need to remove duplicates
	emailMap := make(map[string]bool)
	var anonEmailsClear []string
	for _, e := range anonEmails {
		if _, ok := emailMap[e]; !ok {
			emailMap[e] = true
			anonEmailsClear = append(anonEmailsClear, e)
		}
	}
	return anonEmailsClear, http.StatusOK, nil
}
