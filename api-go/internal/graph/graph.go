package graph

import (
	"net/url"
	"strings"
	"time"

	"github.com/go-rod/rod"
)

func GetSVG(repo string) string {
	path := "https://contributor-graph.apiseven.com/?repo=" + repo
	page := rod.New().MustConnect().MustPage(path).MustWindowFullscreen()

	time.Sleep(5 * time.Second)

	svg := page.MustWaitLoad().MustEval("window.echartInstance.getDataURL()").Str()

	svg, err := url.QueryUnescape(svg)
	if err != nil {
		panic(err)
	}

	strList := strings.Split(svg, "data:image/svg xml;charset=UTF-8,")
	return strList[1]
}
