package main

import (
	"log"

	"github.com/api7/contributor-graph/api/internal/gcpdb"
)

func main() {
	_, _, err := gcpdb.UpdateDB("")
	if err != nil {
		log.Fatal(err)
	}
}
