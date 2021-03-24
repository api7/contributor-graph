package main

import (
	"encoding/json"
	"fmt"
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

type returnObj struct {
	Code         int               `json:"code`
	ErrorMessage string            `json:"message`
	Contributors []utils.ReturnCon `json:"contributors`
}

func main() {
	http.HandleFunc("/contributors", getContributor)
	http.HandleFunc("/contributors-svg", getContributorSVG)
	http.HandleFunc("/refreshAll", refreshAll)

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

	repo = strings.ToLower(repo)

	conList, code, err := contributor.GetContributorList(repo)

	if err != nil {
		w.WriteHeader(code)
		json.NewEncoder(w).Encode(returnObj{Code: code, ErrorMessage: err.Error()})
		return
	}

	json.NewEncoder(w).Encode(returnObj{Contributors: conList})
}

func getContributorSVG(w http.ResponseWriter, r *http.Request) {
	v := r.URL.Query()
	repo := v.Get("repo")
	repo = strings.ToLower(repo)

	w.Header().Add("content-type", "image/svg+xml;charset=utf-8")
	w.Header().Add("cache-control", "public, max-age=86400")

	svg := graph.GetSVG(repo)

	fmt.Fprintf(w, svg)
}

func refreshAll(w http.ResponseWriter, r *http.Request) {
	_, code, err := gcpdb.UpdateDB("")

	if err != nil {
		w.WriteHeader(code)
		json.NewEncoder(w).Encode(returnObj{Code: code, ErrorMessage: err.Error()})
		return
	}
}
