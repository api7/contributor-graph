package utils

import (
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

var (
	DBName       = "contributor"
	RepoDBName   = "Repo"
	ConParentKey = datastore.NameKey("Contributors", "con", nil)
	ProjectID    = "api7-301102"
	UpdateToken  = []string{
		"d5cb5a94b6eb03d0518dece280095891a900b6a3",
		"4be342dc78138f46eb0f17bfd9a192d3142170da",
		"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",
		"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",
		"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",
		"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",
		"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",
	}
	RepoPath = "./config/repo_list.md"
	Token    = "794b296a221cf6b9c08ddcc41de5ef33f45d46d7"

	//concurrency limit to avoid Github API abuse
	UpdateLimit     = 1
	LargeRepoLimit  = 10
	NormalRepoLimit = 500
)

func RepoNameToFileName(str string) string {
	return strings.ReplaceAll(strings.ReplaceAll(str, ",", "+"), "/", "+")
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
