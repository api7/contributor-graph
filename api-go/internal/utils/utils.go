package utils

import (
	"time"

	"cloud.google.com/go/datastore"
)

type ReturnCon struct {
	Date   time.Time `json:"date" bson:"date"`
	Idx    int       `json:"idx" bson:"idx"`
	Author []string  `json:"author_list" bson:"author_list"`
}

type RepoNum struct {
	Num int
}

type ConGH struct {
	Author string
	Email  string
}

type ConList struct {
	Author string
	Date   time.Time
}

var (
	DBName       = "contributor"
	RepoDBName   = "Repo"
	ConParentKey = datastore.NameKey("Contributors", "con", nil)
	ProjectID    = "api7-301102"
	UpdateToken  = "d5cb5a94b6eb03d0518dece280095891a900b6a3"
	RepoPath     = "./config/repo_list"
	Token        = "4be342dc78138f46eb0f17bfd9a192d3142170da"
)
