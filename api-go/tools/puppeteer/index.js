/**
 * Responds to any HTTP request.
 *
 * @param {!express:Request} req HTTP request context.
 * @param {!express:Response} res HTTP response context.
 */
const puppeteer = require('puppeteer');
const querystring = require('querystring');

exports.svg = async (req, res) => {
  const repo = req.query.repo;
  const merge = req.query.merge;
  const chart = req.query.chart;

  const browser = await puppeteer.launch({
    args: ['--no-sandbox',]
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  graphUrl = "https://contributor-graph-git-no-animation-apiseven.vercel.app/?repo=" + repo;
  if (merge) {
    graphUrl += "&merge=true"
  }
  if (chart) {
    graphUrl += "&chart=" + chart
  }

  await page.goto(graphUrl);

  var getSVG = function () {
    return window.echartInstance.getDataURL();
  };

  var svgReady = function () {
    return window.echartsRenderFinished;
  }

  function sleep(time) {
    return new Promise((resolve) => setTimeout(resolve, time));
  }

  sleep(2000).then(() => {
    var _flagCheck = setInterval(async function () {
      if (await page.evaluate(svgReady) === true) {
        clearInterval(_flagCheck);
        var image = await page.evaluate(getSVG);
        res.set('Content-Type', 'image/svg+xml');
        res.send(querystring.unescape(image).split("data:image/svg+xml;charset=UTF-8,")[1]);
        await browser.close();
      }
    }, 100);
  });
};
