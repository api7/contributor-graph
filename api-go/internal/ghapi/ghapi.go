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

// TODO: support goroutine
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
