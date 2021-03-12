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

type comList struct {
	Author string
	Date   time.Time
}

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

func GetContributors(ctx context.Context, owner string, repo string, client *github.Client) ([]string, int, error) {
	listConOpts := &github.ListContributorsOptions{ListOptions: listOpts}
	var contributors []string
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
			contributors = append(contributors, *c.Login)
		}
		if resp.NextPage == 0 {
			break
		}
		listConOpts.Page = resp.NextPage
	}
	log.Printf("Get %d contributors\n", len(contributors))
	return contributors, http.StatusOK, nil
}

func GetAndSortCommits(ctx context.Context, owner string, repo string, contributors []string, client *github.Client) ([]*utils.ReturnCon, int, error) {
	comLists, code, err := getCommits(ctx, owner, repo, contributors, client)
	if err != nil {
		return nil, code, err
	}

	sort.SliceStable(comLists, func(i, j int) bool {
		return comLists[i].Date.Before(comLists[j].Date)
	})

	var returnCons []*utils.ReturnCon
	var authors []string
	var timeLast time.Time
	for i, c := range comLists {
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
	returnCons[len(returnCons)-1] = &utils.ReturnCon{timeLast, len(comLists), authors}

	return returnCons, http.StatusOK, nil
}

func getCommits(ctx context.Context, owner string, repo string, contributors []string, client *github.Client) ([]*comList, int, error) {
	var wg sync.WaitGroup

	errCh := make(chan error, len(contributors))
	conCh := make(chan *comList, len(contributors))

	for i, c := range contributors {
		wg.Add(1)
		go func(i int, c string) {
			defer wg.Done()
			listCommitOpts := &github.CommitsListOptions{Author: c, ListOptions: listOpts}
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
				listCommitOpts.Page = resp.NextPage
			}
			if len(commits) == 0 {
				return
			}
			firstCommitTime := commits[len(commits)-1].GetCommit().Author.Date
			conCh <- &comList{c, *firstCommitTime}
			log.Printf("fetched commits of %s\n", c)
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

	var comLists []*comList
	for c := range conCh {
		comLists = append(comLists, c)
	}

	return comLists, http.StatusOK, nil
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
