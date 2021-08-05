package main

import (
	"context"
	"encoding/csv"
	"fmt"
	"log"
	"os"
	"strconv"

	"cloud.google.com/go/datastore"
	"github.com/api7/contributor-graph/api/internal/gcpdb"
	"github.com/api7/contributor-graph/api/internal/ghapi"
	"github.com/api7/contributor-graph/api/internal/utils"
	"github.com/google/go-github/v33/github"
)

var repos = []string{"repo"}

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

	for _, repo := range repos {
		var res [][]string
		res = append(res, []string{"id", "name", "email", "contributrions", "compamy", "location", "bio", "github url"})

		fmt.Println(repo)
		logins, contributions := getTop500Contributors(ghCli, repo)
		fmt.Printf("get %d contributors\n", len(logins))

		users := getUserMeta(ghCli, logins)

		for i, u := range users {
			res = append(res, []string{logins[i], u.GetName(), u.GetEmail(), contributions[i], u.GetCompany(), u.GetLocation(), fmt.Sprintf("%q", u.GetBio()), u.GetHTMLURL()})
		}

		_, repoName, err := ghapi.SplitRepo(repo)
		if err != nil {
			panic(err)
		}

		file, err := os.Create(repoName + "_contributors.csv")
		if err != nil {
			panic(err)
		}

		w := csv.NewWriter(file)
		for _, r := range res {
			if err := w.Write(r); err != nil {
				panic(err)
			}
		}

		w.Flush()
		if err := w.Error(); err != nil {
			log.Fatal(err)
		}
	}
}

func getTop500Contributors(client *github.Client, repo string) ([]string, []string) {
	ctx := context.Background()
	owner, repoName, err := ghapi.SplitRepo(repo)
	if err != nil {
		panic(err)
	}

	listConOpts := &github.ListContributorsOptions{ListOptions: ghapi.ListOpts}
	var logins, contributions []string
	for {
		cons, resp, err := client.Repositories.ListContributors(ctx, owner, repoName, listConOpts)
		if err != nil {
			panic(err)
		}
		for _, c := range cons {
			logins = append(logins, c.GetLogin())
			contributions = append(contributions, strconv.Itoa(c.GetContributions()))
		}
		if resp.NextPage == 0 {
			break
		}
		listConOpts.Page = resp.NextPage
	}

	return logins, contributions
}

func getUserMeta(client *github.Client, logins []string) []*github.User {
	ctx := context.Background()

	var users []*github.User
	for _, l := range logins {
		user, _, err := client.Users.Get(ctx, l)
		if err != nil {
			panic(err)
		}
		users = append(users, user)
	}

	return users
}
