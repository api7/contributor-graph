package main

import (
	"context"
	"fmt"
	"strings"

	"cloud.google.com/go/datastore"
	"github.com/api7/contributor-graph/api/internal/gcpdb"
	"github.com/api7/contributor-graph/api/internal/utils"
)

var repoName = "repo"

func main() {
	ctx := context.Background()
	dbCli, err := datastore.NewClient(ctx, utils.ProjectID)
	if err != nil {
		panic(err)
	}
	defer dbCli.Close()

	var repoList map[string][]string
	if err := gcpdb.ReadMultiRepoYaml(&repoList); err != nil {
		panic(err)
	}

	if repos, ok := repoList[repoName]; ok {
		for _, repo := range repos {
			if strings.ToLower(repo) == repo {
				continue
			}
			repo = strings.ToLower(repo)
			fmt.Println(repo)
			var conLists []*utils.ConList
			_, err = dbCli.GetAll(ctx, datastore.NewQuery(repo), &conLists)
			if err != nil {
				panic(err)
			}
			keys := make([]*datastore.Key, len(conLists))
			for i, c := range conLists {
				keys[i] = datastore.NameKey(repo, c.Author, utils.ConParentKey)
			}
			key := datastore.NameKey("Repo", repo, nil)
			err = dbCli.Delete(ctx, key)
			if err != nil {
				panic(err)
			}
			err = dbCli.DeleteMulti(ctx, keys)
			if err != nil {
				panic(err)
			}

			_, _, err := gcpdb.UpdateDB(repo)
			if err != nil {
				panic(err)
			}
		}
	}
}
