package activities

import (
	"context"
	"fmt"
	"net/http"
	"strings"

	"github.com/google/go-github/v33/github"

	"github.com/api7/contributor-graph/api/internal/gcpdb"
	"github.com/api7/contributor-graph/api/internal/ghapi"
	"github.com/api7/contributor-graph/api/internal/utils"
)

var (
	listOpts = github.ListOptions{PerPage: 100}
)

type Activities struct {
	PR      []utils.ConList
	Issue   []utils.ConList
	Comment []utils.ConList
	Review  []utils.ConList
}

func GetActivities(repoName string) (Activities, int, error) {
	ctx := context.Background()

	tokens, err := gcpdb.GetTokens(nil)
	if err != nil {
		return Activities{}, http.StatusInternalServerError, err
	}

	ghCli := ghapi.GetGithubClient(ctx, tokens[0].Token)

	issues, prs, code, err := getIssuesAndPRs(ctx, ghCli, repoName)
	if err != nil {
		return Activities{}, code, err
	}
	comments, code, err := getComments(ctx, ghCli, repoName)
	if err != nil {
		return Activities{}, code, err
	}
	reviews, code, err := getReviews(ctx, ghCli, repoName)
	if err != nil {
		return Activities{}, code, err
	}

	return Activities{prs, issues, comments, reviews}, http.StatusOK, nil
}

func getIssuesAndPRs(ctx context.Context, client *github.Client, repoName string) ([]utils.ConList, []utils.ConList, int, error) {
	owner, repo, err := ghapi.SplitRepo(repoName)
	if err != nil {
		return nil, nil, http.StatusBadRequest, err
	}

	issueListOpts := &github.IssueListByRepoOptions{State: "all", ListOptions: listOpts}
	var issues []utils.ConList
	var prs []utils.ConList
	for {
		issuesGet, resp, err := client.Issues.ListByRepo(ctx, owner, repo, issueListOpts)
		if err != nil {
			if strings.Contains(err.Error(), "404 Not Found") {
				return nil, nil, http.StatusNotFound, fmt.Errorf("Repo not found")
			}
			if _, ok := err.(*github.RateLimitError); ok {
				return nil, nil, http.StatusForbidden, fmt.Errorf("Hit rate limit")
			}
			return nil, nil, http.StatusInternalServerError, err
		}
		for _, i := range issuesGet {
			author := *i.User.Login
			createTime := *i.CreatedAt
			if i.PullRequestLinks == nil {
				issues = append(issues, utils.ConList{author, createTime})
			} else {
				prs = append(prs, utils.ConList{author, createTime})
			}
		}
		if resp.NextPage == 0 {
			break
		}
		issueListOpts.Page = resp.NextPage
	}
	fmt.Printf("Get %d issues\n", len(issues))
	fmt.Printf("Get %d PRs\n", len(prs))
	return issues, prs, http.StatusOK, nil
}

func getComments(ctx context.Context, client *github.Client, repoName string) ([]utils.ConList, int, error) {
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
	fmt.Printf("Get %d comments\n", len(comments))
	return comments, http.StatusOK, nil
}

func getReviews(ctx context.Context, client *github.Client, repoName string) ([]utils.ConList, int, error) {
	owner, repo, err := ghapi.SplitRepo(repoName)
	if err != nil {
		return nil, http.StatusBadRequest, err
	}

	PRListOpts := &github.PullRequestListCommentsOptions{ListOptions: listOpts}
	var reviews []utils.ConList
	for {
		reviewsGet, resp, err := client.PullRequests.ListComments(ctx, owner, repo, 0, PRListOpts)
		if err != nil {
			if strings.Contains(err.Error(), "404 Not Found") {
				return nil, http.StatusNotFound, fmt.Errorf("Repo not found")
			}
			if _, ok := err.(*github.RateLimitError); ok {
				return nil, http.StatusForbidden, fmt.Errorf("Hit rate limit")
			}
			return nil, http.StatusInternalServerError, err
		}
		for _, i := range reviewsGet {
			author := *i.User.Login
			createTime := *i.CreatedAt
			reviews = append(reviews, utils.ConList{author, createTime})
		}
		if resp.NextPage == 0 {
			break
		}
		PRListOpts.Page = resp.NextPage
	}
	fmt.Printf("Get %d reviews\n", len(reviews))
	return reviews, http.StatusOK, nil
}
