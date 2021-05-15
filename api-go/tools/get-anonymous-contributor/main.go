package main

import (
	"context"
	"fmt"
	"math"
	"strings"
	"time"

	"cloud.google.com/go/datastore"
	"github.com/api7/contributor-graph/api/internal/gcpdb"
	"github.com/api7/contributor-graph/api/internal/ghapi"
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
	_ = getAnonymous(ctx, dbCli)
	//updateAnonymous(con, ctx, dbCli)
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
	i := 0
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
			var con utils.ConList
			if c.Email != nil {
				con.Author = *c.Email
				commitTime, err := getFirstCommitTime(ctx, ghCli, *c.Email, owner, repo)
				con.Date = commitTime
				if err != nil {
					panic(err)
				}
				fmt.Printf("%d: %s\n", i, con)
				i++
			}
			contributors = append(contributors, &con)
		}
		if resp.NextPage == 0 {
			break
		}
		listConOpts.Page = resp.NextPage
	}
	return contributors
}

func updateAnonymous(ctx context.Context, dbCli *datastore.Client, con []*utils.ConList) {
	rangeMax := 500
	rangeNeeded := int(math.Ceil(float64(len(con)) / float64(rangeMax)))
	for i := 0; i < rangeNeeded; i++ {
		tmpList := con[i*rangeMax : gcpdb.MinInt((i+1)*rangeMax, len(con))]
		keys := make([]*datastore.Key, len(tmpList))
		for i, c := range tmpList {
			keys[i] = datastore.NameKey(repoName, c.Author, utils.ConParentKey)
		}

		if _, err := dbCli.PutMulti(ctx, keys, tmpList); err != nil {
			panic(err)
		}
	}
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
