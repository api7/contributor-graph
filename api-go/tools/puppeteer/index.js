const echarts = require("echarts");
const { createCanvas } = require('canvas');
const { fetchContributorsData, fetchMonthlyData } = require('./fetch');
const { updateSeries } = require('./utils');

const config = {
  width: 896,
  height: 550,
};

/**
 * Responds to any HTTP request.
 *
 * @param {!express:Request} req HTTP request context.
 * @param {!express:Response} res HTTP response context.
 */

exports.png = (req, res) => {
  const repo = req.query.repo;
  const merge = req.query.merge;
  const chartType = req.query.chart;

  const ctx = createCanvas(config.width, config.height);
  echarts.setCanvasCreator(function () {
    return ctx;
  });
  let repoList = repo.split(",");
  Promise.all(repoList.map(item => {
    if (chartType === "contributorMonthlyActivity") {
      return fetchMonthlyData(item);
    };
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

    const option = updateSeries(["1970-01-01"], tmpDataSouce);
    let chart = echarts.init(createCanvas(config.width, config.height));
    chart.setOption(option, true);
    const base64 = chart.getDom().toDataURL();

    res.set('Content-Type', 'image/png');
    res.send(base64);
  }).catch(error => {
    console.log(`generate file of ${repo} error`, error);
  });
};
