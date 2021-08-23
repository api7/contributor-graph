package graph

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"io/ioutil"
	"net/http"
	"time"

	"cloud.google.com/go/datastore"
	"cloud.google.com/go/storage"
	"github.com/api7/contributor-graph/api/internal/utils"
)

// base on experiments :(
var minSuccessfulSVGLen = 7000

func GenerateAndSaveSVG(ctx context.Context, repo string, merge bool, chartType string) (string, error) {
	bucket := "api7-301102.appspot.com"
	object := utils.RepoNameToFileName(repo, merge, chartType)

	client, err := storage.NewClient(ctx)
	if err != nil {
		return "", fmt.Errorf("upload svg failed: storage.NewClient: %v", err)
	}
	defer client.Close()

	graphFunctionUrl := "http://localhost:8081?repo=" + repo
	if merge {
		graphFunctionUrl += "&merge=true"
	}
	if chartType != "" {
		graphFunctionUrl += "&chart=" + string(chartType)
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

	svg, err = svgSucceed(svg)
	if svg == nil {
		fmt.Println("Oops something went wrong. Retry now.")
		if err != nil {
			fmt.Printf("Error: %s\n", err.Error())
		}
		fmt.Println(graphFunctionUrl)
		resp, err = http.Get(graphFunctionUrl)
		if err != nil {
			return "", err
		}
		defer resp.Body.Close()
		svg, err = ioutil.ReadAll(resp.Body)
		if err != nil {
			return "", err
		}
		svg, err = svgSucceed(svg)
		if svg == nil {
			return "", fmt.Errorf("get svg failed since %s", err.Error())
		}
	}

	wc := client.Bucket(bucket).Object(object).NewWriter(ctx)
	wc.CacheControl = "public, max-age=86400"
	wc.ContentType = "image/png"

	if _, err = io.Copy(wc, bytes.NewReader(svg)); err != nil {
		return "", fmt.Errorf("upload svg failed: io.Copy: %v", err)
	}
	if err := wc.Close(); err != nil {
		return "", fmt.Errorf("upload svg failed: Writer.Close: %v", err)
	}

	fmt.Printf("New SVG generated with %s, merge=%v, char=%v\n", repo, merge, chartType)

	return string(svg[:]), nil
}

func SubGetSVG(w http.ResponseWriter, repo string, merge bool, charType string) (string, error) {
	bucket := "api7-301102.appspot.com"
	object := utils.RepoNameToFileName(repo, merge, charType)

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
	if charType == utils.ContributorMonthlyActivity {
		storeName = "monthly-" + repo
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

// Since currently front-end can not give concise time svg got rendered,
// we need to also tell if the graph is ready to use on this side.
// Try to get the endpoint of the line drawn and tell if it's on the right-most side
func svgSucceed(svgBytes []byte) ([]byte, error) {
	// svg := string(svgBytes[:])
	// lines := strings.Split(svg, "\n")
	// var svgWidth float64
	// for _, l := range lines {
	// 	if strings.Contains(l, "<rect") {
	// 		words := strings.Split(l, " ")
	// 		for _, w := range words {
	// 			if strings.Contains(w, "width") {
	// 				parts := strings.Split(w, `"`)
	// 				var err error
	// 				svgWidth, err = strconv.ParseFloat(parts[1], 64)
	// 				if err != nil {
	// 					return nil, err
	// 				}
	// 				break
	// 			}
	// 		}
	// 	}
	// }
	// if svgWidth == 0 {
	// 	return nil, fmt.Errorf("could not get svg width")
	// }
	// lineColor := "39a85a"
	// for i, l := range lines {
	// 	if strings.Contains(l, lineColor) {
	// 		lineDrawn := strings.Split(strings.Split(l, `"`)[1], " ")
	// 		endPointX, err := strconv.ParseFloat(lineDrawn[len(lineDrawn)-2], 64)
	// 		if err != nil {
	// 			return nil, err
	// 		}
	// 		if float64(endPointX) < 0.95*float64(svgWidth) {
	// 			return nil, fmt.Errorf("the line is not reach its end")
	// 		}
	// 		break
	// 	}
	// 	if i == len(lines)-1 {
	// 		return nil, fmt.Errorf("could not get endpoint")
	// 	}
	// }
	// renderLengthMarker := "<path"
	// for i := len(lines) - 1; i >= 0; i-- {
	// 	if strings.Contains(lines[i], renderLengthMarker) {
	// 		words := strings.Split(lines[i], " ")
	// 		svgWidthStr := fmt.Sprintf("%f", svgWidth)
	// 		for j := range words {
	// 			if words[j] == "L" && j+1 < len(words) && words[j+1] != svgWidthStr {
	// 				lines[i] = strings.ReplaceAll(lines[i], words[j+1], svgWidthStr)
	// 				break
	// 			}
	// 		}
	// 		return []byte(strings.Join(lines, "\n")), nil
	// 	}
	// }
	return svgBytes, nil
}
