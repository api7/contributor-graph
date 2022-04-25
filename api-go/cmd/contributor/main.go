package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"

	"cloud.google.com/go/storage"
	"github.com/api7/contributor-graph/api/internal/activities"
	"github.com/api7/contributor-graph/api/internal/contributor"
	"github.com/api7/contributor-graph/api/internal/gcpdb"
	"github.com/api7/contributor-graph/api/internal/graph"
	"github.com/api7/contributor-graph/api/internal/utils"
	"github.com/rs/cors"
)

// TODO
// 怎么存token，留token的API

type returnConObj struct {
	Code         int               `json:"code`
	ErrorMessage string            `json:"message`
	Contributors []utils.ReturnCon `json:"contributors`
}

type returnRepoObj struct {
	Code         int      `json:"code`
	ErrorMessage string   `json:"message`
	Repos        []string `json:"repos`
}

type returnMonthlyConObj struct {
	Code         int                    `json:"code`
	ErrorMessage string                 `json:"message`
	Contributors []utils.MonthlyConList `json:"contributors`
}

func main() {
	mux := http.NewServeMux()
	mux.HandleFunc("/contributors", getContributor)
	mux.HandleFunc("/contributors-svg", getContributorSVG)
	mux.HandleFunc("/contributors-multi", getMultiContributor)
	mux.HandleFunc("/refreshAll", refreshAll)
	mux.HandleFunc("/refreshMonthly", refreshMonthly)
	mux.HandleFunc("/refreshMultiRepo", refreshMultiRepo)
	mux.HandleFunc("/repos", getRepos)
	mux.HandleFunc("/activities", getActivities)
	mux.HandleFunc("/monthly-contributor", getMonthlyContributor)

	//port := os.Getenv("PORT")
	port := "8080"
	c := cors.New(cors.Options{
		AllowedOrigins:   []string{"https://git-contributor.com"},
		AllowCredentials: true,
	})

	log.Printf("Listening on port %s", port)
	if err := http.ListenAndServe(":"+port, c.Handler(mux)); err != nil {
		log.Fatal(err)
	}
}

func getContributor(w http.ResponseWriter, r *http.Request) {
	v := r.URL.Query()
	repo := v.Get("repo")
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	conList, code, err := contributor.GetContributorList(repo)

	if err != nil {
		w.WriteHeader(code)
		json.NewEncoder(w).Encode(returnConObj{Code: code, ErrorMessage: err.Error()})
		return
	}

	json.NewEncoder(w).Encode(returnConObj{Contributors: conList})
}

func getMonthlyContributor(w http.ResponseWriter, r *http.Request) {
	v := r.URL.Query()
	repo := v.Get("repo")
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	monthlyConLists, code, err := contributor.GetContributorMonthly(repo)

	if err != nil {
		w.WriteHeader(code)
		json.NewEncoder(w).Encode(returnMonthlyConObj{Code: code, ErrorMessage: err.Error()})
		return
	}

	json.NewEncoder(w).Encode(returnMonthlyConObj{Contributors: monthlyConLists})
}

func getMultiContributor(w http.ResponseWriter, r *http.Request) {
	v := r.URL.Query()
	repo := v.Get("repo")
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	conList, code, err := gcpdb.MultiCon(repo)

	if err != nil {
		w.WriteHeader(code)
		json.NewEncoder(w).Encode(returnConObj{Code: code, ErrorMessage: err.Error()})
		return
	}

	json.NewEncoder(w).Encode(returnConObj{Contributors: conList})
}

// TODO: authentication, so GCF would not be abused
func getContributorSVG(w http.ResponseWriter, r *http.Request) {
	v := r.URL.Query()
	repo := v.Get("repo")
	merge := v.Get("merge") != ""
	chartType := v.Get("chart")

	svg, err := graph.SubGetSVG(w, repo, merge, chartType)
	if err != nil && err != storage.ErrObjectNotExist && err != utils.ErrSVGNeedUpdate {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(err.Error())
		return
	}

	if svg == "" {
		svg, err = graph.GenerateAndSaveSVG(context.Background(), repo, merge, chartType)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(err.Error())
			return
		}
	}
	w.Header().Add("content-type", "image/svg+xml;charset=utf-8")
	w.Header().Add("cache-control", "public, max-age=86400")

	svg = strings.Replace(svg, "%", "%%", -1)
	fmt.Fprintf(w, svg)
}

func getRepos(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	repos, code, err := gcpdb.GetRepoList()

	if err != nil {
		w.WriteHeader(code)
		json.NewEncoder(w).Encode(returnRepoObj{Code: code, ErrorMessage: err.Error()})
		return
	}

	json.NewEncoder(w).Encode(returnRepoObj{Repos: repos})
}

func getActivities(w http.ResponseWriter, r *http.Request) {
	v := r.URL.Query()
	repo := v.Get("repo")
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	repos, code, err := activities.GetActivities(repo)

	if err != nil {
		w.WriteHeader(code)
		json.NewEncoder(w).Encode(returnRepoObj{Code: code, ErrorMessage: err.Error()})
		return
	}

	json.NewEncoder(w).Encode(repos)
}

func refreshAll(w http.ResponseWriter, r *http.Request) {
	_, code, err := gcpdb.UpdateDB("")

	if err != nil {
		w.WriteHeader(code)
		json.NewEncoder(w).Encode(returnConObj{Code: code, ErrorMessage: err.Error()})
		return
	}
}

func refreshMonthly(w http.ResponseWriter, r *http.Request) {
	_, code, err := contributor.GetContributorMonthly("")

	if err != nil {
		w.WriteHeader(code)
		json.NewEncoder(w).Encode(returnConObj{Code: code, ErrorMessage: err.Error()})
		return
	}
}

func refreshMultiRepo(w http.ResponseWriter, r *http.Request) {
	var repoList map[string][]string
	if err := gcpdb.ReadMultiRepoYaml(&repoList); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(err.Error())
		return
	}
	merge := true
	for repo := range repoList {
		_, err := graph.GenerateAndSaveSVG(context.Background(), repo, merge, utils.ContributorOverTime)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(err.Error())
			return
		}
	}
}
