import React from "react";
import cloneDeep from "lodash.clonedeep";
import ReactECharts from "echarts-for-react";
import MuiAlert from "@material-ui/lab/Alert";
import { Snackbar, makeStyles } from "@material-ui/core";
import * as echarts from "echarts";
import omit from "lodash.omit";
import { Button, ButtonGroup } from "@material-ui/core";
import GetAppIcon from '@material-ui/icons/GetApp';
import FilterNoneOutlinedIcon from '@material-ui/icons/FilterNoneOutlined';
import useClipboard from "react-use-clipboard";
import { saveAs } from 'file-saver';

import { DialogBox } from '../DialogBox'
import { getMonths, getParameterByName, handleShareToTwitterClick } from "../../utils";
import { generateDefaultOption } from "../../constants";
import { fetchData, fetchMergeContributor } from "./service";
import CustomizedDialogs, { MarkdownLink } from "../shareDialog";
import { DEFAULT_COLOR } from "../../constants";
import { Opacity } from "@material-ui/icons";

const ContributorLineChart = ({
  repoList = [],
  showAlert,
  onDelete,
  onLoading,
}) => {
  const mergeRepoList = [
    "apache/apisix",
    "apache/skywalking",
    "apache/openwhisk",
    "apache/dubbo",
    "apache/pulsar",
  ];
  const useStyles = makeStyles(() => ({
    root: {
      backgroundColor: '#e53e3e',
      color: '#fff',
      '&:hover': {
        backgroundColor: '#c53030'
      }
    },
    autocomplete: {
      border: '1px solid #E53E3E',
      color: ' #E53E3E',
      backgroundColor: 'none'
    },
    right: {
      border: '1px solid #E53E3E',
      color: ' #E53E3E',
      '&:hover': {
        backgroundColor: 'rgba(245, 0, 87, 0.04)',
      }
    }
  }));
  const classes = useStyles();
  const [loading, setLoading] = React.useState(false);
  const [dataSource, setDataSource] = React.useState({});
  const [activeDate, setActiveDate] = React.useState("max");
  const [xAxis, setXAxis] = React.useState([]);
  const [shareModalVisible, setShareModalVisible] = React.useState(false);

  const [viewMerge, setViewMerge] = React.useState(false);
  const [mergeRepo, setMergerRepo] = React.useState("");
  const [showMergeButton, setShowMergeButton] = React.useState(false);
  const [openAlert, setOpenAlert] = React.useState(false);

  const getShareParams = () => {
    if (viewMerge) {
      return `?chart=contributorOverTime&repo=${mergeRepo}&merge=true`;
    }
    return `?chart=contributorOverTime&repo=${repoList.join(",")}`;
  };
  const [, setCopied] = useClipboard(`https://git-contributor.com/${getShareParams()}`, { successDuration: 3000 });
  const Alert = (props) => {
    return <MuiAlert elevation={6} variant="filled" {...props} />;
  };

  const [option, setOption] = React.useState(
    generateDefaultOption({
      handleShareClick: () => {
        const params = getShareParams();
        handleShareToTwitterClick(params);
      },
      handleCopyClick: () => {
        setCopied();
        setOpenAlert(true);
      },
      handleDownloadClick: () => {
        const params = getShareParams();
        saveAs(`https://contributor-overtime-api.apiseven.com/contributors-svg${params}`, 'text.svg');
      },
    })
  );

  React.useEffect(() => {
    if (repoList.length > 1) {
      setViewMerge(false);
    }
    setMergerRepo(repoList[repoList.length - 1]);

    const lastItem = repoList[repoList.length - 1];
    const showMerge = mergeRepoList.includes(lastItem);
    setShowMergeButton(showMerge);

    if (repoList.length) {
      window.history.pushState(null, null, getShareParams());
    }
  }, [repoList]);

  const Dialog = React.useCallback(() => {
    return (
      <CustomizedDialogs
        open={shareModalVisible}
        params={getShareParams()}
        onChange={() => {
          setShareModalVisible(false);
        }}
      />
    );
  }, [shareModalVisible]);

  const updateSeries = (passXAxis) => {
    const newClonedOption = cloneDeep(
      generateDefaultOption({
        handleShareClick: () => {
          const params = getShareParams();
          handleShareToTwitterClick(params);
        },
        handleCopyClick: () => {
          setCopied();
          setOpenAlert(true);
        },
        handleDownloadClick: () => {
          const params = getShareParams();
          saveAs(`https://contributor-overtime-api.apiseven.com/contributors-svg${params}`, 'text.svg');
        }
      })
    );
    const datasetWithFilters = [
      ["ContributorNum", "Repo", "Date", "DateValue"],
    ];
    const legend = [];
    const limitDate = new Date(passXAxis[0]).getTime();
    Object.entries(dataSource).forEach(([key, value]) => {
      legend.push(key);
      value.forEach((item) => {
        datasetWithFilters.push([
          item.contributorNum,
          item.repo,
          item.date,
          new Date(item.date).getTime(),
        ]);
      });
    });

    const newDateSet = datasetWithFilters.sort(
      (a, b) => new Date(a[2]) - new Date(b[2])
    );

    const filterDataset = legend.map((item) => ({
      id: item,
      fromDatasetId: "dataset_raw",
      transform: {
        type: "filter",
        config: {
          and: [
            { dimension: "Repo", "=": item },
            { dimension: "DateValue", gte: limitDate },
          ],
        },
      },
    }));

    const series = legend.map((item) => ({
      name: item,
      type: "line",
      datasetId: item,
      showSymbol: false,
      smooth: true,
      encode: {
        x: "Date",
        y: "ContributorNum",
        itemName: "Repo",
        tooltip: ["ContributorNum"],
      },
    }));

    if (series.length === 1) {
      series[0].areaStyle = {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          {
            offset: 0,
            color: DEFAULT_COLOR + "80",
          },
          {
            offset: 1,
            color: DEFAULT_COLOR + "00",
          },
        ]),
      };
      series[0].itemStyle = {
        normal: {
          color: DEFAULT_COLOR,
          lineStyle: {
            color: DEFAULT_COLOR,
          },
        },
      };
    }

    newClonedOption.dataset = [
      {
        id: "dataset_raw",
        source: newDateSet,
      },
    ].concat(filterDataset);

    newClonedOption.series = series;
    newClonedOption.legend.data = legend;

    setOption(newClonedOption);
  };

  React.useEffect(() => {
    switch (activeDate) {
      case "1month":
        setXAxis(getMonths(1));
        break;
      case "3months":
        setXAxis(getMonths(3));
        break;
      case "6months":
        setXAxis(getMonths(6));
        break;
      case "1year":
        setXAxis(getMonths(12));
        break;
      case "max":
        setXAxis(["1970-01-01"]);
        break;
      default:
        break;
    }
  }, [activeDate]);

  React.useEffect(() => {
    updateSeries(xAxis);
    window.parent.postMessage(
      {
        legend: Object.keys(dataSource),
      },
      "*"
    );
  }, [dataSource, xAxis]);

  React.useEffect(() => {
    onLoading(loading);
  }, [loading]);

  React.useEffect(() => {
    const datasourceList = Object.keys(dataSource);

    if (datasourceList.length > repoList.length) {
      const deleteList = datasourceList.filter(
        (item) => !repoList.includes(item)
      );
      const clonedDatasource = cloneDeep(dataSource);
      setDataSource(omit(clonedDatasource, deleteList));
      return;
    }

    if (!viewMerge) {
      setLoading(true);
      Promise.all(repoList.map((item) => fetchData(item, showAlert, onDelete)))
        .then((data) => {
          const tmpDataSouce = {};
          data.forEach((item) => {
            const { Contributors = [], repo } = item;
            const data = Contributors.map((item) => ({
              repo,
              contributorNum: item.idx,
              date: item.date,
            }));

            if (!tmpDataSouce[item.repo]) {
              tmpDataSouce[repo] = data;
            }
          });

          setDataSource(tmpDataSouce);
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
        });
    } else {
      if (!mergeRepo.length) return;
      if (mergeRepo !== repoList[repoList.length - 1]) return;

      setLoading(true);
      fetchMergeContributor([mergeRepo], showAlert, onDelete)
        .then((_data) => {
          const tmpDataSouce = {};
          const { Contributors = [], repo } = _data;
          const data = Contributors.map((item) => ({
            repo: repo.join(","),
            contributorNum: item.idx,
            date: item.date,
          }));

          if (!tmpDataSouce[repo.join(",")]) {
            tmpDataSouce[repo.join(",")] = data;
          }

          setDataSource(tmpDataSouce);
          setLoading(false);
        })
        .catch((e) => {
          setLoading(false);
        });
    }
  }, [repoList, viewMerge]);

  React.useEffect(() => {
    const merge = getParameterByName("merge");
    const repo = getParameterByName("repo");
    if (merge === "true" && mergeRepoList.includes(repo)) {
      setMergerRepo(repo);
      setViewMerge(true);
    }
  }, []);


  return (
    <>
      <div
        className="content"
        style={{
          display: "flex",
          justifyContent: "center",
        }}
      >
        <Dialog />
        <Snackbar
          anchorOrigin={{ vertical: "top", horizontal: "center" }}
          autoHideDuration={6000}
          open={openAlert}
          onClose={() => setOpenAlert(false)}
          key={"topcenter"}
        >
          <Alert severity='success' onClose={() => setOpenAlert(false)}>
            Copy link successfully
          </Alert>
        </Snackbar>
        <div className="right" style={{ width: "90%" }}>
          <div
            id="chart"
            style={{
              marginTop: "10px",
            }}
          >
            <div
              style={{
                marginBottom: "5px",
                display: document.body.clientWidth > 670 ? "flex" : "unset",
                justifyContent: "space-between",
              }}
            >
              <ButtonGroup
                color="secondary"
                size="small"
                style={{
                  width: document.body.clientWidth < 670 ? "100%" : "unset",
                }}
              >
                <Button
                  className={activeDate === "1month" ? classes.root : classes.autocomplete}
                  value="1month"
                  onClick={(e) => {
                    setActiveDate(e.currentTarget.value);
                  }}
                >
                  1 Month
                </Button>
                <Button
                  className={activeDate === "3months" ? classes.root : classes.autocomplete}
                  value="3months"
                  onClick={(e) => {
                    setActiveDate(e.currentTarget.value);
                  }}
                >
                  3 Months
                </Button>
                <Button
                  className={activeDate === "6months" ? classes.root : classes.autocomplete}
                  value="6months"
                  onClick={(e) => {
                    setActiveDate(e.currentTarget.value);
                  }}
                >
                  6 Months
                </Button>
                <Button
                  className={activeDate === "1year" ? classes.root : classes.autocomplete}
                  disableElevation={true}
                  value="1year"
                  onClick={(e) => {
                    setActiveDate(e.currentTarget.value);
                  }}
                >
                  1 Year
                </Button>
                <Button
                  className={activeDate === "max" ? classes.root : classes.autocomplete}
                  value="max"
                  onClick={(e) => {
                    setActiveDate(e.currentTarget.value);
                  }}
                >
                  Max
                </Button>
              </ButtonGroup>

              {showMergeButton && (
                <Button
                  className={classes.right}
                  size="small"
                  onClick={() => {
                    setViewMerge((viewMerge) => !viewMerge);
                  }}
                  style={{
                    width: document.body.clientWidth < 670 ? "100%" : "unset",
                    marginTop:
                      document.body.clientWidth < 670 ? "2px" : "unset",
                  }}
                >
                  {!viewMerge
                    ? `view all repos related to ${mergeRepo}`
                    : "cancel merge view"}
                </Button>
              )}
            </div>
            <ReactECharts
              option={option}
              ref={(e) => {
                if (e) {
                  const echartInstance = e.getEchartsInstance();
                  // then you can use any API of echarts.
                  window.echartInstance = echartInstance;
                }
              }}
              style={{ width: '94%', height: 550, margin: "20px auto 0" }}
              showLoading={loading}
              notMerge
            />
            <DialogBox 
              params={getShareParams()}
            />
            <MarkdownLink
              params={getShareParams()}
              type="contributorOverTime"
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default ContributorLineChart;
