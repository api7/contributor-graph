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

    const browser = await puppeteer.launch({
        args: ['--no-sandbox',]
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    await page.goto("https://contributor-graph-git-no-animation-apiseven.vercel.app/?repo=" + repo);

    var getSVG = function () {
        return window.echartInstance.getDataURL();
    };

    var svgReady = function () {
        return window.echartsRenderFinished;
    }

    var _flagCheck = setInterval(async function () {
        if (await page.evaluate(svgReady) === true) {
            clearInterval(_flagCheck);
            var image = await page.evaluate(getSVG);
            res.set('Content-Type', 'image/svg+xml');
            res.send(querystring.unescape(image).split("data:image/svg+xml;charset=UTF-8,")[1]);
            await browser.close();
        }
    }, 100);
};

