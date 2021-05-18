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

// base on experiments :(
var minSuccessfulSVGLen = 10000

func GenerateAndSaveSVG(ctx context.Context, repo string, merge bool) (string, error) {
	bucket := "api7-301102.appspot.com"
	object := utils.RepoNameToFileName(repo, merge) + ".svg"

	client, err := storage.NewClient(ctx)
	if err != nil {
		return "", fmt.Errorf("upload svg failed: storage.NewClient: %v", err)
	}
	defer client.Close()

	graphFunctionUrl := "https://cloudfunction.contributor-graph.com/svg?repo=" + repo
	if merge {
		graphFunctionUrl += "&merge=true"
	}
	resp, err := http.Get(graphFunctionUrl)
	if err != nil {
		return "", err
	}
	if resp.StatusCode != http.StatusOK {
		// add a simple retry
		fmt.Println("Oops something went wrong when getting svg. Retry now.")
		resp, err = http.Get(graphFunctionUrl)
		if err != nil {
			return "", err
		}
		if resp.StatusCode != http.StatusOK {
			return "", fmt.Errorf("get svg failed with %d", resp.StatusCode)
		}
	}
	defer resp.Body.Close()
	svg, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}
	if len(string(svg[:])) < minSuccessfulSVGLen {
		fmt.Println("Oops something went wrong when getting svg since it's too small. Retry now.")
		resp, err = http.Get(graphFunctionUrl)
		if err != nil {
			return "", err
		}
		defer resp.Body.Close()
		svg, err = ioutil.ReadAll(resp.Body)
		if err != nil {
			return "", err
		}
		if len(string(svg[:])) < minSuccessfulSVGLen {
			return "", fmt.Errorf("get svg failed since size too small %d", len(string(svg[:])))
		}
	}

	// remove stop feature
	svgList := strings.Split(string(svg[:]), "\n")
	newSvg := ""
	for _, l := range svgList {
		if !strings.Contains(l, "stop") {
			newSvg += (l + "\n")
		}
	}

	wc := client.Bucket(bucket).Object(object).NewWriter(ctx)
	wc.CacheControl = "public, max-age=86400"
	wc.ContentType = "image/svg+xml;charset=utf-8"

	if _, err = io.Copy(wc, bytes.NewReader([]byte(newSvg))); err != nil {
		return "", fmt.Errorf("upload svg failed: io.Copy: %v", err)
	}
	if err := wc.Close(); err != nil {
		return "", fmt.Errorf("upload svg failed: Writer.Close: %v", err)
	}

	fmt.Printf("New SVG generated with %s\n", repo)

	return newSvg, nil
}

func SubGetSVG(w http.ResponseWriter, repo string, merge bool) (string, error) {
	bucket := "api7-301102.appspot.com"
	object := utils.RepoNameToFileName(repo, merge) + ".svg"

	ctx := context.Background()
	client, err := storage.NewClient(ctx)
	if err != nil {
		return "", err
	}
	reader, err := client.Bucket(bucket).Object(object).NewReader(ctx)
	if err != nil {
		return "", err
	}
	LastModifiedTime, err := reader.LastModified()
	if err != nil {
		return "", err
	}
	// if the svg is too small (<2kb), or graph is outdated, do the update.
	// TODO: Something wrong with last modified time
	if reader.Size() < 2000 || LastModifiedTime.Add(48*time.Hour).Before(time.Now()) {
		fmt.Println(reader.Size(), LastModifiedTime)
		return "", utils.ErrSVGNeedUpdate
	}

	svg, err := ioutil.ReadAll(reader)
	reader.Close()
	if err != nil {
		return "", err
	}

	dbCli, err := datastore.NewClient(ctx, utils.ProjectID)
	if err != nil {
		return "", fmt.Errorf("Failed to create client: %v", err)
	}
	defer dbCli.Close()

	// note, to record traffic, we need to pay 15 RMB per 1M click
	// if we want to cut off this payment, we could toss a dice here and do the record in a certain probability
	// when people really put the image in their README/website, since the click times is a lot
	// we could still tell if people are using it
	storeName := repo
	if merge {
		storeName = "merge-" + repo
	}
	key := datastore.NameKey("GraphTraffic", storeName, nil)
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
