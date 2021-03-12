package contributor

import (
	"context"
	"fmt"
	"net/http"

	"cloud.google.com/go/datastore"
	"github.com/google/go-github/v33/github"

	"github.com/api7/contributor-graph/api/internal/gcpdb"
	"github.com/api7/contributor-graph/api/internal/ghapi"
	"github.com/api7/contributor-graph/api/internal/utils"
)

var (
	listOpts = github.ListOptions{PerPage: 100}
)

func GetContributorList(repoName string) ([]utils.ReturnCon, int, error) {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	dbCli, err := datastore.NewClient(ctx, utils.ProjectID)
	if err != nil {
		return nil, http.StatusInternalServerError, fmt.Errorf("Failed to create client: %v", err)
	}
	defer dbCli.Close()

	_, _, err = ghapi.SplitRepo(repoName)
	if err != nil {
		return nil, http.StatusBadRequest, fmt.Errorf("Repo format error")
	}

	var returnCons []utils.ReturnCon
	if _, err = dbCli.GetAll(ctx, datastore.NewQuery(repoName).Order("Date"), &returnCons); err != nil {
		return nil, http.StatusInternalServerError, err
	}

	if len(returnCons) == 0 {
		var code int
		returnCons, code, err = gcpdb.UpdateDB(dbCli, repoName)
		if err != nil {
			return nil, code, err
		}
	}

	return returnCons, http.StatusOK, nil
}
