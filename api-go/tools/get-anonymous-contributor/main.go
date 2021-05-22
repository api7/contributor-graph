package main

import (
	"context"
	"fmt"
	"strings"
	"time"

	"cloud.google.com/go/datastore"
	"github.com/api7/contributor-graph/api/internal/gcpdb"
	"github.com/api7/contributor-graph/api/internal/ghapi"
	"github.com/api7/contributor-graph/api/internal/graph"
	"github.com/api7/contributor-graph/api/internal/utils"
	"github.com/google/go-github/v33/github"
)

var repoName = "repo"

func main() {
	ctx := context.Background()
	dbCli, err := datastore.NewClient(ctx, utils.ProjectID)
	if err != nil {
		panic(err)
	}
	defer dbCli.Close()
	fmt.Println("Getting anonymous contributors")
	con := getAnonymous(ctx, dbCli)
	fmt.Println("Waiting 5 seconds to stop it, if something works wrong")
	time.Sleep(5 * time.Second)
	fmt.Println("Updating anonymous contributors to datastore")
	if err := gcpdb.PutMultiWithLimit(ctx, dbCli, repoName, con); err != nil {
		panic(err)
	}

	_, err = graph.GenerateAndSaveSVG(context.Background(), repoName, false)
	if err != nil {
		panic(err)
	}
}

func getAnonymous(ctx context.Context, dbCli *datastore.Client) []*utils.ConList {
	tokens, err := gcpdb.GetTokens(dbCli)
	if err != nil {
		panic(err)
	}

	ghCli := ghapi.GetGithubClient(ctx, tokens[0].Token)

	listConOpts := &github.ListContributorsOptions{ListOptions: ghapi.ListOpts, Anon: "true"}
	owner, repo, err := ghapi.SplitRepo(repoName)
	if err != nil {
		panic(err)
	}
	var contributors []*utils.ConList
	conMap := make(map[string]time.Time)
	numContainsDuplicate := 0
	for {
		cons, resp, err := ghCli.Repositories.ListContributors(ctx, owner, repo, listConOpts)
		if err != nil {
			if strings.Contains(err.Error(), "404 Not Found") {
				panic(fmt.Errorf("Repo not found"))
			}
			if _, ok := err.(*github.RateLimitError); ok {
				panic(fmt.Errorf("Hit rate limit"))
			}
			panic(err)
		}
		for _, c := range cons {
			email := c.GetEmail()
			if email != "" {
				numContainsDuplicate++
				commitTime, err := getFirstCommitTime(ctx, ghCli, email, owner, repo)
				if err != nil {
					panic(err)
				}
				if t, ok := conMap[email]; ok && t.Before(commitTime) {
					continue
				}
				conMap[email] = commitTime
			}
		}
		if resp.NextPage == 0 {
			break
		}
		listConOpts.Page = resp.NextPage
	}
	i := 0
	for email, time := range conMap {
		con := utils.ConList{email, time}
		contributors = append(contributors, &con)
		fmt.Printf("%d: %v\n", i, con)
		i++
	}
	fmt.Printf("Got %d anonymous contributors, after remove duplicate, %d ones left\n", numContainsDuplicate, len(contributors))
	return contributors
}

func getFirstCommitTime(ctx context.Context, ghCli *github.Client, author string, owner string, repo string) (time.Time, error) {
	listCommitOpts := &github.CommitsListOptions{Author: author, ListOptions: ghapi.ListOpts}
	var commits []*github.RepositoryCommit
	for {
		coms, resp, err := ghCli.Repositories.ListCommits(ctx, owner, repo, listCommitOpts)
		if err != nil {
			if _, ok := err.(*github.RateLimitError); ok {
				return time.Time{}, fmt.Errorf("Hit rate limit")
			}
			return time.Time{}, err
		}
		commits = coms
		if resp.NextPage == 0 {
			break
		}
		listCommitOpts.Page = resp.NextPage
	}
	firstCommitTime := commits[len(commits)-1].GetCommit().GetAuthor().GetDate()
	return firstCommitTime, nil
}
