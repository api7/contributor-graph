# Deploy

## Web

Once the master branch gets updated, the GitHub Action will run and push web static files to Aliyun OSS.

## API

We use Golang here, and once we push commits to the master branch, the [GCP Cloud Build](https://console.cloud.google.com/cloud-build) will update the API Server.
