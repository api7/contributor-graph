# Contributor Graph

This tool is used to generate contributor graphs across repositories. We use Github API to get all commits, try to find the "Github way" to filter commits so the result data would be similar to Github, and then get the first commit time of each contributor. All of the procedures are running on GCP, and it would automatically update the graph each day, so the link would always present the real-time data.

## Demo

### Contributor over time for single repo

[![Contributor over time](https://contributor-overtime-api.git-contributor.com/contributors-svg?chart=contributorOverTime&repo=apache/apisix)](https://git-contributor.com?chart=contributorOverTime&repo=apache/apisix)

### Contributor over time across related repo

We maintain a [list](api-go/config/multi-repo.yaml) which you could directly add your repo list and commit a PR if needed.

[![Contributor over time](https://contributor-overtime-api.git-contributor.com/contributors-svg?chart=contributorOverTime&repo=apache/apisix&merge=true)](https://git-contributor.com?chart=contributorOverTime&repo=apache/apisix&merge=true)

### Monthly Active Contributors

[![Monthly Active Contributors](https://contributor-overtime-api.git-contributor.com/contributors-svg?chart=contributorMonthlyActivity&repo=apache/apisix&merge=true)](https://git-contributor.com?chart=contributorMonthlyActivity&repo=apache/apisix&merge=true)

## Feature request

If you have any requests, including but not limited to:

1. aggregate contributors across repos
2. add "[anonymous](https://docs.github.com/en/rest/reference/repos#list-repository-contributors)" to stats
3. import svn contributors (especially for Apache repos)
   Don't hesitate to leave an issue and we'll try to fulfill your request to make our project got better compatibility.

## License

[Apache 2.0 License](./LICENSE)
