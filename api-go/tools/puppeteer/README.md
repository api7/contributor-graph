# Google Clould Function

Google Clould Function used to generate contributor statistics picture.

## API

The entry point of the function is `png` in `index.js`.

| Parameter | Required | Type | Description | Example |
|  ----  | ----  | ---- | ---- | ---- |
| repo | true | string | The name of repository | apache/apisix,apache/skywalking |
| merge | false | boolean | Whether to view all repos related to this repo, when chart is `contributorMonthlyActivity`, can not be set true | true |
| chart | false | contributorOverTime contributorMonthlyActivity | chart type | |
