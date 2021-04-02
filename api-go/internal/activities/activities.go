package activities

import (
	"context"
	"fmt"
	"net/http"
	"strings"

	"github.com/google/go-github/v33/github"

	"github.com/api7/contributor-graph/api/internal/ghapi"
	"github.com/api7/contributor-graph/api/internal/utils"
)

var (
	listOpts = github.ListOptions{PerPage: 100}
)

type Activities struct {
	PR            []utils.ConList
	Issue         []utils.ConList
	PR_comment    []utils.ConList
	issue_comment []utils.ConList
}

func GetActivities(repoName string) (Activities, int, error) {
	ctx := context.Background()
	ghCli := ghapi.GetGithubClient(ctx, utils.Token)
	issues, code, err := getIssues(ctx, ghCli, repoName)
	if err != nil {
		return Activities{}, code, err
	}
	issueComments, code, err := getIssueComments(ctx, ghCli, repoName)
	if err != nil {
		return Activities{}, code, err
	}
	prs, code, err := getPRs(ctx, ghCli, repoName)
	if err != nil {
		return Activities{}, code, err
	}
	prComments, code, err := getPRComments(ctx, ghCli, repoName)
	if err != nil {
		return Activities{}, code, err
	}
	return Activities{prs, issues, prComments, issueComments}, http.StatusOK, nil
}

func getIssues(ctx context.Context, client *github.Client, repoName string) ([]utils.ConList, int, error) {
	owner, repo, err := ghapi.SplitRepo(repoName)
	if err != nil {
		return nil, http.StatusBadRequest, err
	}

	issueListOpts := &github.IssueListByRepoOptions{State: "all", ListOptions: listOpts}
	var issues []utils.ConList
	for {
		issuesGet, resp, err := client.Issues.ListByRepo(ctx, owner, repo, issueListOpts)
		if err != nil {
			if strings.Contains(err.Error(), "404 Not Found") {
				return nil, http.StatusNotFound, fmt.Errorf("Repo not found")
			}
			if _, ok := err.(*github.RateLimitError); ok {
				return nil, http.StatusForbidden, fmt.Errorf("Hit rate limit")
			}
			return nil, http.StatusInternalServerError, err
		}
		for _, i := range issuesGet {
			author := *i.User.Login
			createTime := *i.CreatedAt
			issues = append(issues, utils.ConList{author, createTime})
		}
		if resp.NextPage == 0 {
			break
		}
		issueListOpts.Page = resp.NextPage
	}
	fmt.Printf("Get %d issues\n", len(issues))
	return issues, http.StatusOK, nil
}

func getIssueComments(ctx context.Context, client *github.Client, repoName string) ([]utils.ConList, int, error) {
	owner, repo, err := ghapi.SplitRepo(repoName)
	if err != nil {
		return nil, http.StatusBadRequest, err
	}

	issueListOpts := &github.IssueListCommentsOptions{ListOptions: listOpts}
	var comments []utils.ConList
	for {
		commentsGet, resp, err := client.Issues.ListComments(ctx, owner, repo, 0, issueListOpts)
		if err != nil {
			if strings.Contains(err.Error(), "404 Not Found") {
				return nil, http.StatusNotFound, fmt.Errorf("Repo not found")
			}
			if _, ok := err.(*github.RateLimitError); ok {
				return nil, http.StatusForbidden, fmt.Errorf("Hit rate limit")
			}
			return nil, http.StatusInternalServerError, err
		}
		for _, i := range commentsGet {
			author := *i.User.Login
			createTime := *i.CreatedAt
			comments = append(comments, utils.ConList{author, createTime})
		}
		if resp.NextPage == 0 {
			break
		}
		issueListOpts.Page = resp.NextPage
	}
	fmt.Printf("Get %d issue comments\n", len(comments))
	return comments, http.StatusOK, nil
}

func getPRs(ctx context.Context, client *github.Client, repoName string) ([]utils.ConList, int, error) {
	owner, repo, err := ghapi.SplitRepo(repoName)
	if err != nil {
		return nil, http.StatusBadRequest, err
	}

	PRListOpts := &github.PullRequestListOptions{State: "all", ListOptions: listOpts}
	var PRs []utils.ConList
	for {
		issuesGet, resp, err := client.PullRequests.List(ctx, owner, repo, PRListOpts)
		if err != nil {
			if strings.Contains(err.Error(), "404 Not Found") {
				return nil, http.StatusNotFound, fmt.Errorf("Repo not found")
			}
			if _, ok := err.(*github.RateLimitError); ok {
				return nil, http.StatusForbidden, fmt.Errorf("Hit rate limit")
			}
			return nil, http.StatusInternalServerError, err
		}
		for _, i := range issuesGet {
			author := *i.User.Login
			createTime := *i.CreatedAt
			PRs = append(PRs, utils.ConList{author, createTime})
		}
		if resp.NextPage == 0 {
			break
		}
		PRListOpts.Page = resp.NextPage
	}
	fmt.Printf("Get %d PRs\n", len(PRs))
	return PRs, http.StatusOK, nil
}

func getPRComments(ctx context.Context, client *github.Client, repoName string) ([]utils.ConList, int, error) {
	owner, repo, err := ghapi.SplitRepo(repoName)
	if err != nil {
		return nil, http.StatusBadRequest, err
	}

	PRListOpts := &github.PullRequestListCommentsOptions{ListOptions: listOpts}
	var PRcomments []utils.ConList
	for {
		commentsGet, resp, err := client.PullRequests.ListComments(ctx, owner, repo, 0, PRListOpts)
		if err != nil {
			if strings.Contains(err.Error(), "404 Not Found") {
				return nil, http.StatusNotFound, fmt.Errorf("Repo not found")
			}
			if _, ok := err.(*github.RateLimitError); ok {
				return nil, http.StatusForbidden, fmt.Errorf("Hit rate limit")
			}
			return nil, http.StatusInternalServerError, err
		}
		for _, i := range commentsGet {
			author := *i.User.Login
			createTime := *i.CreatedAt
			PRcomments = append(PRcomments, utils.ConList{author, createTime})
		}
		if resp.NextPage == 0 {
			break
		}
		PRListOpts.Page = resp.NextPage
	}
	fmt.Printf("Get %d PR commments\n", len(PRcomments))
	return PRcomments, http.StatusOK, nil
}
