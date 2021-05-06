package graph

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"io/ioutil"
	"net/http"
	"time"

	"cloud.google.com/go/storage"
	"github.com/api7/contributor-graph/api/internal/utils"
)

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

	wc := client.Bucket(bucket).Object(object).NewWriter(ctx)
	wc.CacheControl = "public, max-age=86400"
	wc.ContentType = "image/svg+xml;charset=utf-8"

	if _, err = io.Copy(wc, bytes.NewReader(svg)); err != nil {
		return "", fmt.Errorf("upload svg failed: io.Copy: %v", err)
	}
	if err := wc.Close(); err != nil {
		return "", fmt.Errorf("upload svg failed: Writer.Close: %v", err)
	}

	fmt.Printf("New SVG generated with %s\n", repo)
	return string(svg[:]), nil
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
	return string(svg), nil
}
