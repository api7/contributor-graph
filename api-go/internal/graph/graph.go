package graph

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"io/ioutil"
	"net/http"

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
	fmt.Printf("New SVG generated with %s\n", repo)
	return nil
}
