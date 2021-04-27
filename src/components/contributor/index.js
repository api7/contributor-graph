import React from "react";
import cloneDeep from "lodash.clonedeep";
import { Row, Col, Tab } from "react-bootstrap";
import ReactECharts from "echarts-for-react";
import * as echarts from "echarts";
import omit from "lodash.omit";

import CompareComponent from "../../components/compare";
import { Button, ButtonGroup } from "@material-ui/core";
import { getMonths } from "../../utils";
import { generateDefaultOption } from "../../constants";
import { fetchData, fetchMergeContributor } from "./service";
import CustomizedDialogs from "../shareDialog";
import { DEFAULT_COLOR } from "../../constants";

const ContributorLineChart = ({
  repoList = ["apache/apisix"],
  showAlert,
  onDelete,
  onLoading,
  isMerge = false,
  mergeRepo = ""
}) => {
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

  const getShareParams = () => {
    if (isMerge) {
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
    console.log("shareModalVisible: ", shareModalVisible);
  }, [shareModalVisible]);

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

    if (!isMerge) {
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
      setLoading(true);
      fetchMergeContributor(mergeRepo, showAlert, onDelete)
        .then(_data => {
          const tmpDataSouce = {};
          const { Contributors = [], repo } = _data;
          const data = Contributors.map(item => ({
            repo,
            contributorNum: item.idx,
            date: item.date
          }));

          if (!tmpDataSouce[_data.repo]) {
            tmpDataSouce[repo] = data;
          }

          setDataSource(tmpDataSouce);
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
        });
    }
  }, [repoList, isMerge]);

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
        <div className="right" style={{ width: "100%" }}>
          {/* <div style={{ marginTop: "10px" }}>
            <CompareComponent
              list={Object.keys(dataSource)}
              onDelete={e => {
                const clonedDataSource = cloneDeep(dataSource);
                const newDataSource = omit(clonedDataSource, [e]);
                setDataSource(newDataSource);
                onDelete(e);
              }}
            />
          </div> */}
          <div id="chart" style={{ marginTop: "20px", padding: "0px 40px" }}>
            <Tab.Container defaultActiveKey="contributor">
              <Row>
                <Col>
                  <Tab.Content>
                    <Tab.Pane eventKey="contributor">
                      <div style={{ marginBottom: "5px" }}>
                        <ButtonGroup color="secondary" size="small">
                          <Button
                            variant={
                              activeDate === "1month" ? "contained" : "outlined"
                            }
                            value="1month"
                            onClick={e => {
                              setActiveDate(e.currentTarget.value);
                            }}
                          >
                            1 Month
                          </Button>
                          <Button
                            variant={
                              activeDate === "3months"
                                ? "contained"
                                : "outlined"
                            }
                            value="3months"
                            onClick={e => {
                              setActiveDate(e.currentTarget.value);
                            }}
                          >
                            3 Months
                          </Button>
                          <Button
                            variant={
                              activeDate === "6months"
                                ? "contained"
                                : "outlined"
                            }
                            value="6months"
                            onClick={e => {
                              setActiveDate(e.currentTarget.value);
                            }}
                          >
                            6 Months
                          </Button>
                          <Button
                            variant={
                              activeDate === "1year" ? "contained" : "outlined"
                            }
                            value="1year"
                            onClick={e => {
                              setActiveDate(e.currentTarget.value);
                            }}
                          >
                            1 Year
                          </Button>
                          <Button
                            variant={
                              activeDate === "max" ? "contained" : "outlined"
                            }
                            value="max"
                            onClick={e => {
                              setActiveDate(e.currentTarget.value);
                            }}
                          >
                            Max
                          </Button>
                        </ButtonGroup>
                      </div>
                      <ReactECharts
                        option={option}
                        // opts={{ renderer: "svg" }}
                        ref={e => {
                          if (e) {
                            const echartInstance = e.getEchartsInstance();
                            // then you can use any API of echarts.
                            window.echartInstance = echartInstance;
                          }
                        }}
                        style={{ height: 600 }}
                        showLoading={loading}
                        notMerge
                      />
                    </Tab.Pane>
                  </Tab.Content>
                </Col>
              </Row>
            </Tab.Container>
          </div>
        </div>
      </div>
    </>
  );
};

export default ContributorLineChart;
