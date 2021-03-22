package ghapi

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/google/go-github/v33/github"
	"github.com/hashicorp/go-multierror"
	"golang.org/x/oauth2"

	"github.com/api7/contributor-graph/api/internal/utils"
)

var (
	listOpts = github.ListOptions{PerPage: 100}
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

func GetContributors(ctx context.Context, client *github.Client, repoName string) ([]utils.ConGH, int, error) {
	owner, repo, err := SplitRepo(repoName)
	if err != nil {
		return nil, http.StatusBadRequest, err
	}

	listConOpts := &github.ListContributorsOptions{ListOptions: listOpts, Anon: "true"}
	var contributors []utils.ConGH
	for {
		cons, resp, err := client.Repositories.ListContributors(ctx, owner, repo, listConOpts)
		if err != nil {
			if resp == nil {
				if strings.Contains(err.Error(), "404 Not Found") {
					return nil, http.StatusNotFound, fmt.Errorf("Repo not found")
				}
				return nil, http.StatusInternalServerError, err
			}
			if _, ok := err.(*github.RateLimitError); ok {
				return nil, resp.StatusCode, fmt.Errorf("Hit rate limit")
			}
			return nil, resp.StatusCode, err
		}
		for _, c := range cons {
			var con utils.ConGH
			if c.Login != nil {
				con.Author = *c.Login
			} else if c.Name != nil {
				con.Author = *c.Name
				con.Email = *c.Email
			}
			contributors = append(contributors, con)
		}
		if resp.NextPage == 0 {
			break
		}
		listConOpts.Page = resp.NextPage
	}
	log.Printf("Get %d contributors\n", len(contributors))
	return contributors, http.StatusOK, nil
}

func FormatCommits(ctx context.Context, comLists []*utils.ConList) ([]*utils.ReturnCon, int, error) {
	var returnCons []*utils.ReturnCon
	var authors []string
	var timeLast time.Time
	for i, c := range comLists {
		if c.Date.IsZero() {
			continue
		}
		if compareSameDay(c.Date, timeLast) {
			authors = append(authors, c.Author)
		} else {
			if len(authors) > 0 {
				returnCons = append(returnCons, &utils.ReturnCon{timeLast, i, authors})
			}
			timeLast = c.Date
			authors = []string{c.Author}
		}
	}
	returnCons = append(returnCons, &utils.ReturnCon{timeLast, len(comLists), authors})

	return returnCons, http.StatusOK, nil
}

func GetCommits(ctx context.Context, client *github.Client, repoName string, contributors []utils.ConGH) ([]*utils.ConList, int, error) {
	owner, repo, err := SplitRepo(repoName)
	if err != nil {
		return nil, http.StatusBadRequest, err
	}

	maxConcurrency := 500
	if len(contributors) > 500 {
		maxConcurrency = 10
	}

	var wg sync.WaitGroup

	errCh := make(chan error, len(contributors))
	conCh := make(chan *utils.ConList, len(contributors))
	guard := make(chan int, maxConcurrency)

	for i, c := range contributors {
		wg.Add(1)
		go func(i int, c utils.ConGH) {
			guard <- 1
			defer wg.Done()
			var comList utils.ConList
			comList.Author = c.Author
			commit := getLastCommit(ctx, errCh, c.Author, owner, repo, client)
			if commit == nil && c.Email != "" {
				comList.Author = c.Email
				commit = getLastCommit(ctx, errCh, c.Email, owner, repo, client)
			}
			if commit == nil {
				log.Printf("no commits fetched from %v\n", c)
			} else {
				comList.Date = *commit.GetCommit().Author.Date
				conCh <- &comList
				log.Printf("fetched no.%d commits of %v\n", i, c)
			}
			<-guard
		}(i, c)
	}
	wg.Wait()
	close(errCh)
	close(conCh)

	var multiErr error
	for err := range errCh {
		multiErr = multierror.Append(multiErr, err)
	}
	if multiErr != nil {
		return nil, http.StatusInternalServerError, multiErr
	}

	// filter out duplication
	conExists := make(map[string]time.Time)
	for c := range conCh {
		_, ok := conExists[c.Author]
		if !ok {
			conExists[c.Author] = c.Date
		} else {
			if conExists[c.Author].After(c.Date) {
				conExists[c.Author] = c.Date
			}
		}
	}

	var conLists []*utils.ConList
	for author, date := range conExists {
		conLists = append(conLists, &utils.ConList{author, date})
	}

	sort.SliceStable(conLists, func(i, j int) bool {
		return conLists[i].Date.Before(conLists[j].Date)
	})

	return conLists, http.StatusOK, nil
}

func getLastCommit(ctx context.Context, errCh chan error, author string, owner string, repo string, client *github.Client) *github.RepositoryCommit {
	listCommitOpts := &github.CommitsListOptions{Author: author, ListOptions: listOpts}
	var commits []*github.RepositoryCommit
	for {
		coms, resp, err := client.Repositories.ListCommits(ctx, owner, repo, listCommitOpts)
		if err != nil {
			if resp == nil {
				errCh <- err
			}
			if _, ok := err.(*github.RateLimitError); ok {
				errCh <- fmt.Errorf("Hit rate limit")
			}
			errCh <- err
		}
		commits = coms
		if resp.NextPage == 0 {
			break
		}
		listCommitOpts.Page = resp.LastPage
	}
	if len(commits) == 0 {
		return nil
	}
	return commits[len(commits)-1]
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
