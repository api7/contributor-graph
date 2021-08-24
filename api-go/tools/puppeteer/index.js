const echarts = require("echarts");
const { createCanvas } = require('canvas');
const { Storage } = require('@google-cloud/storage');
const { fetchData } = require('./fetch');
const { updateSeries } = require('./utils');

const fs = require('fs');

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

  const storage = new Storage();
  const myBucket = storage.bucket('api7-301102.appspot.com');

  const ctx = createCanvas(config.width, config.height);
  echarts.setCanvasCreator(function () {
    return ctx;
  });
  let repoList = repo.split(",");
  Promise.all(repoList.map(item => fetchData(item))).then(data => {
    const tmpDataSouce = {};
    data.forEach(item => {
      const { Contributors = [], repo } = item;
      const data = Contributors.map(item => ({
        repo,
        contributorNum: item.idx,
        date: item.date
      }));
  
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
    // file.save(buffer, (err) => {
    //   if (err) {
    //     console.log('save file error');
    //     throw err;
    //   } else {
    //     console.log(`return filename ${fileName} ok ~`);
    //     res.status(200).send(fileName);
    //   }
    // });
  }).catch(error => {
    console.log(`generate file of ${repo} error`, error);
  });
};
