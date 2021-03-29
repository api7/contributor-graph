package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"strings"

	"github.com/api7/contributor-graph/api/internal/contributor"
	"github.com/api7/contributor-graph/api/internal/gcpdb"
	"github.com/api7/contributor-graph/api/internal/graph"
	"github.com/api7/contributor-graph/api/internal/utils"
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

func main() {
	http.HandleFunc("/contributors", getContributor)
	http.HandleFunc("/contributors-svg", getContributorSVG)
	http.HandleFunc("/refreshAll", refreshAll)
	http.HandleFunc("/repos", getRepos)

	//port := os.Getenv("PORT")
	port := "8080"

	log.Printf("Listening on port %s", port)
	if err := http.ListenAndServe(":"+port, nil); err != nil {
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

// TODO: authentication, so GCF would not be abused
func getContributorSVG(w http.ResponseWriter, r *http.Request) {
	v := r.URL.Query()
	repo := v.Get("repo")

	w.Header().Add("content-type", "image/svg+xml;charset=utf-8")
	w.Header().Add("cache-control", "public, max-age=86400")

	svg, err := subGetSVG(w, repo)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(err.Error())
		return
	}

	if strings.Contains(svg, "AccessDenied") {
		if err = graph.GenerateAndSaveSVG(context.Background(), repo); err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(err.Error())
			return
		}
		svg, err = subGetSVG(w, repo)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(err.Error())
			return
		}
	}

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

func refreshAll(w http.ResponseWriter, r *http.Request) {
	_, code, err := gcpdb.UpdateDB("")

	if err != nil {
		w.WriteHeader(code)
		json.NewEncoder(w).Encode(returnConObj{Code: code, ErrorMessage: err.Error()})
		return
	}
}

func subGetSVG(w http.ResponseWriter, repo string) (string, error) {
	resp, err := http.Get("https://storage.googleapis.com/api7-301102.appspot.com/" + utils.RepoNameToFileName(repo) + ".svg")
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	svg, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}
	return string(svg), nil
}
