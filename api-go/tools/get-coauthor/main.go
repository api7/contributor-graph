package main

import (
	"context"
	"fmt"
	"sort"
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

	tokens, err := gcpdb.GetTokens(dbCli)
	if err != nil {
		panic(err)
	}

	ghCli := ghapi.GetGithubClient(ctx, tokens[0].Token)

	coAuthors := getCoAuthors(ghCli)

	bindAuthors, unBindAuthors := searchUser(ghCli, dbCli, coAuthors)

	for i, a := range bindAuthors {
		fmt.Printf("found bind author: %d: %s\n", i+1, a)
	}
	for i, a := range unBindAuthors {
		fmt.Printf("found unbind author: %d: %s\n", i+1, a)
	}
}

func getCoAuthors(ghCli *github.Client) map[string]bool {
	ctx := context.Background()
	owner, repo, err := ghapi.SplitRepo(repoName)
	if err != nil {
		panic(err)
	}
	ListOpts := github.ListOptions{PerPage: 100}
	listCommitOpts := &github.CommitsListOptions{ListOptions: ListOpts}
	coAuthors := make(map[string]bool)
	for {
		commits, resp, err := ghCli.Repositories.ListCommits(ctx, owner, repo, listCommitOpts)
		if err != nil {
			if strings.Contains(err.Error(), "404 Not Found") {
				panic(fmt.Errorf("repo not found"))
			}
			if _, ok := err.(*github.RateLimitError); ok {
				panic(fmt.Errorf("hit rate limit"))
			}
			panic(err)
		}
		for _, c := range commits {
			message := c.Commit.GetMessage()
			coLists := strings.Split(message, "Co-authored-by")
			if len(coLists) == 1 {
				continue
			}
			for _, s := range coLists {
				s1 := strings.Split(s, "<")
				if len(s1) < 2 {
					continue
				}
				s2 := strings.Split(s1[1], ">")
				if len(s2) < 1 {
					continue
				}
				coAuthors[s2[0]] = true
			}
		}
		if resp.NextPage == 0 {
			break
		}
		listCommitOpts.Page = resp.NextPage
	}
	return coAuthors
}

func searchUser(ghCli *github.Client, dbCli *datastore.Client, coAuthors map[string]bool) ([]string, []string) {
	ctx := context.Background()

	conLists := []*utils.ConList{}
	_, err := dbCli.GetAll(ctx, datastore.NewQuery(repoName), &conLists)
	if err != nil {
		panic(err)
	}
	conMap := make(map[string]bool)
	for _, c := range conLists {
		conMap[c.Author] = true
	}

	i := 0
	var bindAuthors []string
	var unBindAuthors []string
	for c := range coAuthors {
		users, _, err := ghCli.Search.Users(ctx, c, &github.SearchOptions{})
		if err != nil {
			if strings.Contains(err.Error(), "404 Not Found") {
				panic(fmt.Errorf("repo not found"))
			}
			if _, ok := err.(*github.RateLimitError); ok {
				panic(fmt.Errorf("hit rate limit"))
			}
			panic(err)
		}
		if len(users.Users) > 0 {
			login := *users.Users[0].Login
			if _, ok := conMap[login]; !ok {
				login = "[NEW]" + login
			}
			bindAuthors = append(bindAuthors, login)
		} else {
			unBindAuthors = append(unBindAuthors, c)
		}
		i++
		if i%30 == 0 {
			fmt.Println("Sleep due to rate limit")
			time.Sleep(60 * time.Second)
		}
	}

	sort.SliceStable(bindAuthors, func(i, j int) bool {
		return strings.ToLower(bindAuthors[i]) < strings.ToLower(bindAuthors[j])
	})

	return bindAuthors, unBindAuthors
}
