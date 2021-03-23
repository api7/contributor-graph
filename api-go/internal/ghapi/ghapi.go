package ghapi

import (
	"context"
	"fmt"
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
			} else if c.Email != nil {
				con.Author = *c.Email
			}
			contributors = append(contributors, con)
		}
		if resp.NextPage == 0 {
			break
		}
		listConOpts.Page = resp.NextPage
	}
	fmt.Printf("Get %d contributors\n", len(contributors))
	return contributors, http.StatusOK, nil
}

func FormatCommits(ctx context.Context, comLists []*utils.ConList) ([]*utils.ReturnCon, int, error) {
	var returnCons []*utils.ReturnCon
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
				returnCons = append(returnCons, &utils.ReturnCon{timeLast, i - numNotCount, authors})
			}
			timeLast = c.Date
			authors = []string{c.Author}
		}
	}
	returnCons = append(returnCons, &utils.ReturnCon{timeLast, len(comLists) - numNotCount, authors})

	return returnCons, http.StatusOK, nil
}

func GetCommits(ctx context.Context, client *github.Client, repoName string, contributors []utils.ConGH, maxConcurrency int) ([]*utils.ConList, int, error) {
	owner, repo, err := SplitRepo(repoName)
	if err != nil {
		return nil, http.StatusBadRequest, err
	}

	if maxConcurrency == 0 {
		if len(contributors) > 500 {
			maxConcurrency = utils.LargeRepoLimit
		} else {
			maxConcurrency = utils.NormalRepoLimit
		}
	}

	errCh := make(chan error, len(contributors))
	conCh := make(chan *utils.ConList, len(contributors))

	if maxConcurrency == utils.UpdateLimit {
		// use parallel for update to avoid Github API abuse
		for i, c := range contributors {
			getCommit(ctx, errCh, conCh, c, i, owner, repo, client)
			select {
			case err := <-errCh:
				return nil, http.StatusInternalServerError, err
			default:
			}
		}
	} else {
		var wg sync.WaitGroup
		guard := make(chan int, maxConcurrency)
		for i, c := range contributors {
			wg.Add(1)
			defer wg.Done()
			go func(i int, c utils.ConGH) {
				guard <- 1
				getCommit(ctx, errCh, conCh, c, i, owner, repo, client)
				<-guard
			}(i, c)
		}
		wg.Wait()
	}

	close(errCh)
	close(conCh)

	var multiErr error
	for err := range errCh {
		multiErr = multierror.Append(multiErr, err)
	}
	if multiErr != nil {
		//return nil, http.StatusInternalServerError, multiErr
		fmt.Printf("###################################\n")
		fmt.Printf("###################################\n")
		fmt.Printf(multiErr.Error())
		fmt.Printf("###################################\n")
		fmt.Printf("###################################\n")
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

func getCommit(ctx context.Context, errCh chan error, conCh chan *utils.ConList, c utils.ConGH, i int, owner string, repo string, client *github.Client) {
	comList := utils.ConList{Author: c.Author}
	var commit *github.RepositoryCommit

	commit = getLastCommit(ctx, errCh, c.Author, owner, repo, client)
	if commit == nil {
		comList.Date = time.Time{}
		fmt.Printf("no commits fetched from %v\n", c)
	} else {
		comList.Date = *commit.GetCommit().Author.Date
		fmt.Printf("fetched No.%d commits of %v\n", i+1, c)
	}
	conCh <- &comList
}

func getLastCommit(ctx context.Context, errCh chan error, author string, owner string, repo string, client *github.Client) *github.RepositoryCommit {
	listCommitOpts := &github.CommitsListOptions{Author: author}
	var commits []*github.RepositoryCommit

	// TODO: Currently Github API Linker head has bugs, that NextPage would exceed LastPage
	// Only ignore this problem in this way. Need to update when receiving Github Support
	// Another bug is for some contributors, ListCommits returns no commits
	commits, resp, err := client.Repositories.ListCommits(ctx, owner, repo, listCommitOpts)
	if err != nil {
		if _, ok := err.(*github.RateLimitError); ok {
			errCh <- fmt.Errorf("Hit rate limit")
			return nil
		}
		errCh <- err
		return nil
	}
	if resp.NextPage != 0 {
		listCommitOpts.Page = resp.LastPage
		commits, resp, err = client.Repositories.ListCommits(ctx, owner, repo, listCommitOpts)
		if err != nil {
			if _, ok := err.(*github.RateLimitError); ok {
				errCh <- fmt.Errorf("Hit rate limit")
				return nil
			}
			errCh <- err
			return nil
		}
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
