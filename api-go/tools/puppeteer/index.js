/**
 * Responds to any HTTP request.
 *
 * @param {!express:Request} req HTTP request context.
 * @param {!express:Response} res HTTP response context.
 */
const echarts = require("echarts");
const { createCanvas } = require('canvas');
const jsdom = require("jsdom");
const { fetchContributorsData, fetchMonthlyData, fetchMergeContributor } = require('./fetch');
const { updateSeries } = require('./utils');
const { JSDOM } = jsdom;

const config = {
  width: 896,
  height: 550,
};

const mergeRepoList = [
  "apache/apisix",
  "apache/skywalking",
  "apache/openwhisk",
  "apache/dubbo"
];

exports.svg = async (req, res) => {
  const repo = req.query.repo;
  const merge = req.query.merge;
  const chartType = req.query.chart;

  const window = (new JSDOM(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Document</title>
    </head>
    <body>
      <div style="width:${config.width}px;height:${config.height}px" id='echarts'></div>
    </body>
    </html>
  `)).window;

  const { document } = window;
  global.document = document;

  const ctx = createCanvas(config.width, config.height);
  echarts.setCanvasCreator(function () {
    return ctx;
  });
  let repoList = repo.split(",");

  Promise.all(repoList.map(item => {
    if (chartType === "contributorMonthlyActivity") {
      console.log(`render contributorMonthlyActivity for ${repo}`);
      return fetchMonthlyData(item);
    };
    if (merge === "true" && repoList.length === 1 && mergeRepoList.includes(repo)) {
      console.log(`render merge contributor for ${repo}`);
      return fetchMergeContributor(repo);
    }
    console.log(`render contributorData for ${repo}`);
    return fetchContributorsData(item);
  })).then(data => {
    const tmpDataSouce = {};
    data.forEach(item => {
      const { Contributors = [], repo } = item;
      const data = Contributors.map(item => {
        if (chartType === "contributorMonthlyActivity") {
          return {
            repo,
            contributorNum: item.Num,
            date: item.Month
          }
        } else {
          return {
            repo,
            contributorNum: item.idx,
            date: item.date
          }
        }
      });
  
      if (!tmpDataSouce[item.repo]) {
        tmpDataSouce[repo] = data;
      }
    });

    const title = chartType === "contributorMonthlyActivity" ? "Monthly Active Contributors" : "Contributor Over Time";
    const option = updateSeries(["1970-01-01"], tmpDataSouce, title);
    let chart = echarts.init(document.getElementById('echarts'), {}, {renderer: "svg"});
    chart.setOption(option, true);
    const image = chart.getSvgDataURL();

    res.set('Content-Type', 'image/svg+xml');
    res.send(decodeURIComponent(image).split("data:image/svg+xml;charset=UTF-8,")[1]);
  }).catch(error => {
    console.log(`generate file of ${repo} error`, error);
  })
};
