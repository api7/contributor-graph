package main

import (
	"context"
	"strconv"

	"cloud.google.com/go/datastore"

	"github.com/api7/contributor-graph/api/internal/utils"
)

func main() {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	dbCli, err := datastore.NewClient(ctx, utils.ProjectID)
	if err != nil {
		panic(err)
	}
	defer dbCli.Close()

	UpdateToken := []string{
		"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",
		"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",
	}
	var tokens []*utils.Token

	keys := make([]*datastore.Key, len(UpdateToken))
	for i := range UpdateToken {
		keys[i] = datastore.NameKey("token", strconv.Itoa(i), nil)
		tokens = append(tokens, &utils.Token{UpdateToken[i]})
	}

	if _, err := dbCli.PutMulti(ctx, keys, tokens); err != nil {
		panic(err)
	}
}
