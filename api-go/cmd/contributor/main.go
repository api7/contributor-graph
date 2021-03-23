package main

import (
	"encoding/json"
	"log"
	"net/http"
	"strings"

	"github.com/api7/contributor-graph/api/internal/contributor"
	"github.com/api7/contributor-graph/api/internal/gcpdb"
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
	w.Header().Set("Content-Type", "application/json")

	repo = strings.ToLower(repo)

	conList, code, err := contributor.GetContributorList(repo)

	if err != nil {
		http.Error(w, err.Error(), code)
		json.NewEncoder(w).Encode(returnObj{Code: code, ErrorMessage: err.Error()})
		return
	}

	json.NewEncoder(w).Encode(returnObj{Contributors: conList})
}

func refreshAll(w http.ResponseWriter, r *http.Request) {
	_, code, err := gcpdb.UpdateDB("")

	if err != nil {
		http.Error(w, err.Error(), code)
		json.NewEncoder(w).Encode(returnObj{Code: code, ErrorMessage: err.Error()})
		return
	}
}
