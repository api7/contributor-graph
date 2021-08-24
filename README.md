# Contributor Graph

This tool is used to generate contributor graphs across repositories. We use Github API to get all commits, try to find the "Github way" to filter commits so the result data would be similar to Github, and then get the first commit time of each contributor. All of the procedures are running on GCP, and it would automatically update the graph each day, so the link would always present the real-time data.

## Demo

### Contributor over time for single repo

[![Contributor over time](https://contributor-overtime-api.apiseven.com/contributors-svg?chart=contributorOverTime&repo=apache/apisix)](https://www.apiseven.com/en/contributor-graph?chart=contributorOverTime&repo=apache/apisix)

### Contributor over time across related repo

We maintain a [list](api-go/config/multi-repo.md) which you could directly add your repo list and commit a PR if needed.

[![Contributor over time](https://contributor-overtime-api.apiseven.com/contributors-svg?chart=contributorOverTime&repo=apache/apisix&merge=true)](https://www.apiseven.com/en/contributor-graph?chart=contributorOverTime&repo=apache/apisix&merge=true)

### Monthly Active Contributors

[![Monthly Active Contributors](https://contributor-overtime-api.apiseven.com/contributors-svg?chart=contributorMonthlyActivity&repo=apache/apisix&merge=true)](https://www.apiseven.com/en/contributor-graph?chart=contributorMonthlyActivity&repo=apache/apisix&merge=true)

## Development

The current project uses Google Cloud deployment, to develop and debug locally, follow the steps below:

This project depends on `Golang` and `Node.js`, please make sure you have the corresponding environment.

Because the read and write functions of Google Clould DataStore and Google Clould DataStorage are used in the project, you need to obtain the corresponding permissions of this.

It is recommended to download the key file of Google Clould in json format, and then set the environment variable locally:

```
GOOGLE_APPLICATION_CREDENTIALS=/The/path/of/json/key/file
```

1. Clone the project.

```
git clone https://github.com/api7/contributor-graph.git
```

2. Start the front end.

```
cd contributor-graph
yarn
yarn dev
```

3. Start API Server.

```
cd api-go
go run ./cmd/contributor/main.go
```

4. Start Google Cloud Function locally.

This step depends on [@google-cloud/functions-framework](https://www.npmjs.com/package/@google-cloud/functions-framework) tool, please install the tool first.

```
cd ./api-go/tools/puppeteer
yarn
npx @google-cloud/functions-framework --target=png
```

Then config this address as Clould Function Trigger link in `api-go`.

## Feature request

If you have any requests, including but not limited to:

1. aggregate contributors across repos
2. add "[anonymous](https://docs.github.com/en/rest/reference/repos#list-repository-contributors)" to stats
3. import svn contributors (especially for Apache repos)
   Don't hesitate to leave an issue and we'll try to fulfill your request to make our project got better compatibility.

## License

[Apache 2.0 License](./LICENSE)
