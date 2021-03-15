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
	returnCons[len(returnCons)-1] = &utils.ReturnCon{timeLast, len(comLists), authors}

	return returnCons, http.StatusOK, nil
}

func GetCommits(ctx context.Context, client *github.Client, repoName string, contributors []utils.ConGH) ([]*utils.ConList, int, error) {
	owner, repo, err := SplitRepo(repoName)
	if err != nil {
		return nil, http.StatusBadRequest, err
	}

	var wg sync.WaitGroup

	errCh := make(chan error, len(contributors))
	conCh := make(chan *utils.ConList, len(contributors))

	for i, c := range contributors {
		wg.Add(1)
		go func(i int, c utils.ConGH) {
			defer wg.Done()
			var comList utils.ConList
			comList.Author = c.Author
			commits := getLastCommit(ctx, errCh, c.Author, owner, repo, client)
			if len(commits) == 0 {
				comList.Author = c.Email
				commits = getLastCommit(ctx, errCh, c.Email, owner, repo, client)
				if len(commits) == 0 {
					comList.Date = time.Time{}
					conCh <- &comList
					log.Printf("commits of %v not exists\n", c)
					return
				}
			}
			comList.Date = *commits[len(commits)-1].GetCommit().Author.Date
			conCh <- &comList
			log.Printf("fetched commits of %v\n", c)
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

	var comLists []*utils.ConList
	for c := range conCh {
		comLists = append(comLists, c)
	}

	sort.SliceStable(comLists, func(i, j int) bool {
		return comLists[i].Date.Before(comLists[j].Date)
	})

	return comLists, http.StatusOK, nil
}

func getLastCommit(ctx context.Context, errCh chan error, author string, owner string, repo string, client *github.Client) []*github.RepositoryCommit {
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
	return commits
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
