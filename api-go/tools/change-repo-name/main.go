package main

import (
	"context"
	"fmt"

	"cloud.google.com/go/datastore"
	"github.com/api7/contributor-graph/api/internal/utils"
)

var orig_name = "orig"
var new_name = "new"

func main() {
	ctx := context.Background()

	dbCli, err := datastore.NewClient(ctx, utils.ProjectID)
	if err != nil {
		panic(err)
	}
	defer dbCli.Close()

	fmt.Printf("Refresh %s Page\n", orig_name)
	refreshProject(ctx, dbCli, orig_name, new_name)
	fmt.Printf("Refresh %s Monthly Page\n", orig_name)
	refreshProjectMonthly(ctx, dbCli, "Monthly-"+orig_name, "Monthly-"+new_name)

	fmt.Println("Refresh Repo Page")
	refreshRepo(ctx, dbCli, orig_name, new_name, "Repo")
	fmt.Println("Refresh Repo Monthly Page")
	refreshRepo(ctx, dbCli, orig_name, new_name, "Monthly-Repo")

	fmt.Println("DONE")
}

func refreshProject(ctx context.Context, dbCli *datastore.Client, ori string, new string) {
	var conLists []*utils.ConList
	keys, err := dbCli.GetAll(ctx, datastore.NewQuery(ori), &conLists)
	if err != nil {
		panic(err)
	}

	if err := dbCli.DeleteMulti(ctx, keys); err != nil {
		panic(err)
	}

	for i := range keys {
		keys[i].Kind = new
	}

	if _, err = dbCli.PutMulti(ctx, keys, conLists); err != nil {
		panic(err)
	}
}

func refreshProjectMonthly(ctx context.Context, dbCli *datastore.Client, ori string, new string) {
	var conLists []*utils.MonthlyConList
	keys, err := dbCli.GetAll(ctx, datastore.NewQuery(ori), &conLists)
	if err != nil {
		panic(err)
	}

	if err := dbCli.DeleteMulti(ctx, keys); err != nil {
		panic(err)
	}

	for i := range keys {
		keys[i].Kind = new
	}

	if _, err = dbCli.PutMulti(ctx, keys, conLists); err != nil {
		panic(err)
	}
}

func refreshRepo(ctx context.Context, dbCli *datastore.Client, ori string, new string, pageName string) {
	key := datastore.NameKey(pageName, ori, nil)
	repo := &utils.RepoNum{}
	if err := dbCli.Get(ctx, key, repo); err != nil {
		panic(err)
	}

	key.Name = new
	if _, err := dbCli.Put(ctx, key, repo); err != nil {
		panic(err)
	}

	if err := dbCli.Delete(ctx, key); err != nil {
		panic(err)
	}
}
