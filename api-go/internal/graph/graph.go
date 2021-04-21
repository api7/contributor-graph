package graph

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"io/ioutil"
	"net/http"
	"strings"
	"time"

	"cloud.google.com/go/datastore"
	"cloud.google.com/go/storage"
	"github.com/api7/contributor-graph/api/internal/utils"
)

func GenerateAndSaveSVG(ctx context.Context, repo string) error {
	bucket := "api7-301102.appspot.com"
	object := utils.RepoNameToFileName(repo) + ".svg"

	client, err := storage.NewClient(ctx)
	if err != nil {
		return fmt.Errorf("upload svg failed: storage.NewClient: %v", err)
	}
	defer client.Close()

	resp, err := http.Get("https://asia-east2-api7-301102.cloudfunctions.net/svg?repo=" + repo)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	svg, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return err
	}

	if !strings.Contains(repo, ",") {
		wc := client.Bucket(bucket).Object(object).NewWriter(ctx)
		wc.ACL = []storage.ACLRule{{Entity: storage.AllUsers, Role: storage.RoleReader}}
		wc.CacheControl = "public, max-age=86400"
		wc.ContentType = "image/svg+xml;charset=utf-8"

		if _, err = io.Copy(wc, bytes.NewReader(svg)); err != nil {
			return fmt.Errorf("upload svg failed: io.Copy: %v", err)
		}
		if err := wc.Close(); err != nil {
			return fmt.Errorf("upload svg failed: Writer.Close: %v", err)
		}
	}
	fmt.Printf("New SVG generated with %s\n", repo)
	return nil
}

func SubGetSVG(w http.ResponseWriter, repo string) (string, error) {
	resp, err := http.Get("https://storage.googleapis.com/api7-301102.appspot.com/" + utils.RepoNameToFileName(repo) + ".svg")
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	svg, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	ctx := context.Background()
	dbCli, err := datastore.NewClient(ctx, utils.ProjectID)
	if err != nil {
		return "", fmt.Errorf("Failed to create client: %v", err)
	}
	defer dbCli.Close()

	// note, to record traffic, we need to pay 15 RMB per 1M click
	// if we want to cut off this payment, we could toss a dice here and do the record in a certain probability
	// when people really put the image in their README/website, since the click times is a lot
	// we could still tell if people are using it
	key := datastore.NameKey("GraphTraffic", repo, nil)
	traffic := utils.GraphTraffic{}
	err = dbCli.Get(ctx, key, &traffic)
	if err != nil {
		if err != datastore.ErrNoSuchEntity {
			return "", err
		}
	}
	if _, err = dbCli.Put(ctx, key, &utils.GraphTraffic{traffic.Num + 1, time.Now()}); err != nil {
		return "", err
	}

	return string(svg), nil
}
