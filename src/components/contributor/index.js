import React from "react";
import cloneDeep from "lodash.clonedeep";
import ReactECharts from "echarts-for-react";
import * as echarts from "echarts";
import omit from "lodash.omit";
import { Button, ButtonGroup } from "@material-ui/core";

import { getMonths, getParameterByName } from "../../utils";
import { generateDefaultOption } from "../../constants";
import { fetchData, fetchMergeContributor } from "./service";
import CustomizedDialogs, { MarkdownLink } from "../shareDialog";
import { DEFAULT_COLOR } from "../../constants";

const ContributorLineChart = ({
  repoList = [],
  showAlert,
  onDelete,
  onLoading
}) => {
  const mergeRepoList = [
    "apache/apisix",
    "apache/skywalking",
    "apache/openwhisk",
    "apache/dubbo"
  ];

  const [loading, setLoading] = React.useState(false);
  const [dataSource, setDataSource] = React.useState({});
  const [activeDate, setActiveDate] = React.useState("max");
  const [xAxis, setXAxis] = React.useState([]);
  const [shareModalVisible, setShareModalVisible] = React.useState(false);
  const [option, setOption] = React.useState(
    generateDefaultOption({
      handleShareClick: () => {
        setShareModalVisible(true);
      }
    })
  );

  const [viewMerge, setViewMerge] = React.useState(false);
  const [mergeRepo, setMergerRepo] = React.useState("");
  const [showMergeButton, setShowMergeButton] = React.useState(false);

  React.useEffect(() => {
    if(repoList.length > 1) {
      setViewMerge(false);
    }
    setMergerRepo(repoList[repoList.length - 1]);

    const lastItem = repoList[repoList.length - 1];
    const showMerge = mergeRepoList.includes(lastItem);
    setShowMergeButton(showMerge);
  }, [repoList]);

  const getShareParams = () => {
    if (viewMerge) {
      return `?chart=contributorOverTime&repo=${mergeRepo}&merge=true`;
    }
    return `?chart=contributorOverTime&repo=${repoList.join(",")}`;
  };

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

  const updateSeries = passXAxis => {
    const newClonedOption = cloneDeep(
      generateDefaultOption({
        handleShareClick: () => {
          setShareModalVisible(true);
        }
      })
    );
    const datasetWithFilters = [
      ["ContributorNum", "Repo", "Date", "DateValue"]
    ];
    const legend = [];
    const limitDate = new Date(passXAxis[0]).getTime();
    Object.entries(dataSource).forEach(([key, value]) => {
      legend.push(key);
      value.forEach(item => {
        datasetWithFilters.push([
          item.contributorNum,
          item.repo,
          item.date,
          new Date(item.date).getTime()
        ]);
      });
    });

    const newDateSet = datasetWithFilters.sort(
      (a, b) => new Date(a[2]) - new Date(b[2])
    );

    const filterDataset = legend.map(item => ({
      id: item,
      fromDatasetId: "dataset_raw",
      transform: {
        type: "filter",
        config: {
          and: [
            { dimension: "Repo", "=": item },
            { dimension: "DateValue", gte: limitDate }
          ]
        }
      }
    }));

    const series = legend.map(item => ({
      name: item,
      type: "line",
      datasetId: item,
      showSymbol: false,
      smooth: true,
      encode: {
        x: "Date",
        y: "ContributorNum",
        itemName: "Repo",
        tooltip: ["ContributorNum"]
      }
    }));

    if (series.length === 1) {
      series[0].areaStyle = {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          {
            offset: 0,
            color: DEFAULT_COLOR + "80"
          },
          {
            offset: 1,
            color: DEFAULT_COLOR + "00"
          }
        ])
      };
      series[0].itemStyle = {
        normal: {
          color: DEFAULT_COLOR,
          lineStyle: {
            color: DEFAULT_COLOR
          }
        }
      };
    }

    newClonedOption.dataset = [
      {
        id: "dataset_raw",
        source: newDateSet
      }
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
        legend: Object.keys(dataSource)
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
        item => !repoList.includes(item)
      );
      const clonedDatasource = cloneDeep(dataSource);
      setDataSource(omit(clonedDatasource, deleteList));
      return;
    }

    if (!viewMerge) {
      setLoading(true);
      Promise.all(repoList.map(item => fetchData(item, showAlert, onDelete)))
        .then(data => {
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
        .then(_data => {
          const tmpDataSouce = {};
          const { Contributors = [], repo } = _data;
          const data = Contributors.map(item => ({
            repo: repo.join(","),
            contributorNum: item.idx,
            date: item.date
          }));

          if (!tmpDataSouce[repo.join(",")]) {
            tmpDataSouce[repo.join(",")] = data;
          }

          setDataSource(tmpDataSouce);
          setLoading(false);
        })
        .catch(e => {
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
          justifyContent: "center"
        }}
      >
        <Dialog />
        <div className="right" style={{ width: "90%" }}>
          <div
            id="chart"
            style={{
              marginTop: "10px"
            }}
          >
            <div
              style={{
                marginBottom: "5px",
                display: document.body.clientWidth > 670 ? "flex" : "unset",
                justifyContent: "space-between"
              }}
            >
              <ButtonGroup
                color="secondary"
                size="small"
                style={{
                  width: document.body.clientWidth < 670 ? "100%" : "unset"
                }}
              >
                <Button
                  variant={activeDate === "1month" ? "contained" : "outlined"}
                  value="1month"
                  onClick={e => {
                    setActiveDate(e.currentTarget.value);
                  }}
                >
                  1 Month
                </Button>
                <Button
                  variant={activeDate === "3months" ? "contained" : "outlined"}
                  value="3months"
                  onClick={e => {
                    setActiveDate(e.currentTarget.value);
                  }}
                >
                  3 Months
                </Button>
                <Button
                  variant={activeDate === "6months" ? "contained" : "outlined"}
                  value="6months"
                  onClick={e => {
                    setActiveDate(e.currentTarget.value);
                  }}
                >
                  6 Months
                </Button>
                <Button
                  variant={activeDate === "1year" ? "contained" : "outlined"}
                  value="1year"
                  onClick={e => {
                    setActiveDate(e.currentTarget.value);
                  }}
                >
                  1 Year
                </Button>
                <Button
                  variant={activeDate === "max" ? "contained" : "outlined"}
                  value="max"
                  onClick={e => {
                    setActiveDate(e.currentTarget.value);
                  }}
                >
                  Max
                </Button>
              </ButtonGroup>

              {showMergeButton && (
                <Button
                  color="primary"
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    setViewMerge(viewMerge => !viewMerge);
                  }}
                  style={{
                    width: document.body.clientWidth < 670 ? "100%" : "unset",
                    marginTop: document.body.clientWidth < 670 ? "2px" : "unset"
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
              opts={{ renderer: "svg" }}
              onEvents={{
                finished: () => {
                  window.echartsRenderFinished = true;
                }
              }}
              ref={e => {
                if (e) {
                  const echartInstance = e.getEchartsInstance();
                  // then you can use any API of echarts.
                  window.echartInstance = echartInstance;
                }
              }}
              style={{ height: 550, marginTop: "20px" }}
              showLoading={loading}
              notMerge
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
