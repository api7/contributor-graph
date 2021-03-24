package graph

import (
	"github.com/go-rod/rod"
)

func GetSVG(repo string) string {
	page := rod.New().MustConnect().MustPage("https://contributor-graph.apiseven.com/?repo=apache/apisix/").MustWindowFullscreen()

	svg := page.MustWaitLoad().MustEval("window.echartInstance.getDataURL()").Str()

	return svg
}
