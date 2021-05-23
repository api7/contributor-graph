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

type GraphTraffic struct {
	Num           int
	LastVisitTime time.Time
}
type Token struct {
	Token string
}

var (
	DBName           = "contributor"
	RepoDBName       = "Repo"
	ConParentKey     = datastore.NameKey("Contributors", "con", nil)
	ProjectID        = "api7-301102"
	RepoPath         = "./config/repo_list.md"
	MultiRepoPath    = "./config/multi-repo.yaml"
	ErrSVGNeedUpdate = errors.New("SVG need to upddate")

	ContributorOverTime        = "contributorOverTime"
	ContributorMonthlyActivity = "contributorMonthlyActivity"
)

func RepoNameToFileName(str string, merge bool, charType string) string {
	filename := strings.ReplaceAll(strings.ReplaceAll(str, ",", "+"), "/", "+")
	if merge {
		filename = "merge/" + filename
	}
	if charType != "" {
		filename = "monthly/" + filename
	}
	return filename + ".svg"
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
