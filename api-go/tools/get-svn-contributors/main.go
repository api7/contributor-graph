package main

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"log"
	"os"
	"os/exec"
	"sort"
	"strings"
	"time"

	"cloud.google.com/go/datastore"
	"github.com/api7/contributor-graph/api/internal/gcpdb"
	"github.com/api7/contributor-graph/api/internal/utils"
)

var (
	// Example:
	// repoSVNLink = "http://svn.apache.org/repos/asf/tomcat"
	// repoName    = "apache/tomcat"
	repoSVNLink = "link"
	repoName    = "repo"
)

func main() {
	ctx := context.Background()
	dbCli, err := datastore.NewClient(ctx, utils.ProjectID)
	if err != nil {
		panic(err)
	}
	defer dbCli.Close()

	var conLists []*utils.ConList
	_, err = dbCli.GetAll(ctx, datastore.NewQuery(repoName), &conLists)
	if err != nil {
		panic(err)
	}
	conListsMap := make(map[string]time.Time)
	for _, c := range conLists {
		conListsMap[c.Author] = c.Date
	}

	conMap := getSVNContributors()
	var newConLists []*utils.ConList
	for name, commitTime := range conMap {
		// try to filter out the duplicates between svn and git
		if oldTime, ok := conListsMap[name]; ok && oldTime.Before(commitTime) {
			continue
		}
		newConLists = append(newConLists, &utils.ConList{name, commitTime})
	}

	fmt.Printf("Got %d new contributors\n", len(newConLists))
	sort.SliceStable(newConLists, func(i, j int) bool {
		return newConLists[i].Date.Before(newConLists[j].Date)
	})
	for _, c := range newConLists {
		fmt.Printf("%s, %v\n", c.Author, c.Date)
	}

	if err := gcpdb.PutMultiWithLimit(ctx, dbCli, repoName, newConLists); err != nil {
		panic(err)
	}

	if err := gcpdb.UpdateRepoList(ctx, dbCli, repoName, len(newConLists)+len(conLists), true); err != nil {
		panic(err)
	}

	fmt.Println("done")
}

func getSVNContributors() map[string]time.Time {
	fmt.Println("Start fetching svn contributors")
	out := runSVNLog()
	lines := strings.Split(string(out), "\n")
	conMap := make(map[string]time.Time)
	for _, l := range lines {
		if l == "" {
			break
		}
		items := strings.Split(l, "|")
		name := strings.TrimSpace(items[1])
		t1 := strings.Split(items[2], "(")[0]
		t2 := strings.Split(items[2], "(")[1]
		t := strings.TrimRight(t2, ")") + " " + strings.TrimRight(strings.SplitN(t1, " ", 3)[2], " ")
		parsedTime, err := time.Parse(time.RFC1123Z, t)
		if err != nil {
			panic(err)
		}
		timeBefore, ok := conMap[name]
		if !ok || timeBefore.After(parsedTime) {
			conMap[name] = parsedTime
		}
	}
	return conMap
}

func runSVNLog() string {
	svnLogCmd := fmt.Sprintf(`svn log --quiet -v %s | grep "^r"`, repoSVNLink)
	cmd := exec.Command(`bash`, `-c`, svnLogCmd)

	stdoutIn, _ := cmd.StdoutPipe()
	stderrIn, _ := cmd.StderrPipe()

	var errStdout, errStderr error
	var stdoutBuf, stderrBuf bytes.Buffer
	stdout := io.MultiWriter(os.Stdout, &stdoutBuf)
	stderr := io.MultiWriter(os.Stderr, &stderrBuf)

	err := cmd.Start()
	if err != nil {
		log.Fatalf("cmd.Start() failed with '%s'\n", err)
	}
	go func() {
		_, errStdout = io.Copy(stdout, stdoutIn)
	}()
	go func() {
		_, errStderr = io.Copy(stderr, stderrIn)
	}()
	err = cmd.Wait()
	if err != nil {
		log.Fatalf("cmd.Run() failed with %s\n", err)
	}
	if errStdout != nil || errStderr != nil {
		log.Fatal("failed to capture stdout or stderr\n")
	}
	outStr, _ := string(stdoutBuf.Bytes()), string(stderrBuf.Bytes())
	fmt.Println("######################################")
	return outStr
}
