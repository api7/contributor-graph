package utils

import (
	"errors"
	"strings"
	"time"

	"cloud.google.com/go/datastore"
)

type ReturnCon struct {
	Date   time.Time `json:"date" bson:"date"`
	Idx    int       `json:"idx" bson:"idx"`
	Author []string  `json:"author_list" bson:"author_list"`
}

type RepoNum struct {
	Num              int
	LastModifiedTime time.Time
}

type ConGH struct {
	Author string
}

type ConList struct {
	Author string
	Date   time.Time
}

type MonthlyConList struct {
	Month time.Time
	Num   int
}

type LastModifiedTime struct {
	LastModifiedTime time.Time
}

type ErrorWithCode struct {
	Err  error
	Code int
}

var (
	DBName       = "contributor"
	RepoDBName   = "Repo"
	ConParentKey = datastore.NameKey("Contributors", "con", nil)
	ProjectID    = "api7-301102"
	UpdateToken  = []string{
		"d5cb5a94b6eb03d0518dece280095891a900b6a3",
		"4be342dc78138f46eb0f17bfd9a192d3142170da",
		"794b296a221cf6b9c08ddcc41de5ef33f45d46d7",
	}
	RepoPath         = "./config/repo_list.md"
	MultiRepoPath    = "./config/multi-repo.yaml"
	Token            = "794b296a221cf6b9c08ddcc41de5ef33f45d46d7"
	ErrSVGNeedUpdate = errors.New("SVG need to upddate")

	//concurrency limit to avoid Github API abuse
	// UpdateLimit     = 1
	// LargeRepoLimit  = 10
	// NormalRepoLimit = 100
)

func RepoNameToFileName(str string, merge bool) string {
	filename := strings.ReplaceAll(strings.ReplaceAll(str, ",", "+"), "/", "+")
	if merge {
		filename = "merge/" + filename
	}
	return filename
}

func FileNameToRepoName(str string) string {
	for {
		oldStr := str
		str = strings.Replace(str, "+", "/", 1)
		str = strings.Replace(str, "+", ",", 1)
		if oldStr == str {
			break
		}
	}
	return str
}
