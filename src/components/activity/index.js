import React from "react";
import cloneDeep from "lodash.clonedeep";
import { Row, Col, Tab } from "react-bootstrap";
import * as echarts from "echarts";
import ReactECharts from "echarts-for-react";
import omit from "lodash.omit";

import { DEFAULT_ACTIVITY_OPTIONS, DEFAULT_COLOR } from "../../constants";

const ActivityChart = ({
  repoList = ["apache/apisix"],
  showAlert,
  onDelete,
  onLoading
}) => {
  const [loading, setLoading] = React.useState(false);
  const [dataSource, setDataSource] = React.useState({});
  const [xAxis] = React.useState(["1970-01-01"]);
  const [option, setOption] = React.useState({
    ...DEFAULT_ACTIVITY_OPTIONS,
    tooltip: {
      trigger: "axis",
      formatter: params => {
        const text = params.map(item => {
          return `<span>${item.marker}${item.seriesName}&nbsp&nbsp <b>${item.value[0]}</b></span><br>`;
        });

        return [params[0].value[2].substring(0, 7), text]
          .join("</br>")
          .replace(/,/g, "");
      }
    }
  });

  const updateSeries = passXAxis => {
    const newClonedOption = cloneDeep({
      ...DEFAULT_ACTIVITY_OPTIONS,
      tooltip: {
        trigger: "axis",
        formatter: params => {
          const text = params.map(item => {
            return `<span>${item.marker}${item.seriesName}&nbsp&nbsp <b>${item.value[0]}</b></span><br>`;
          });

          return [params[0].value[2].substring(0, 7), text]
            .join("</br>")
            .replace(/,/g, "");
        }
      }
    });
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

  const fetchData = repo => {
    if (repo === "null" || repo === null) {
      repo = "apache/apisix";
    }
    return new Promise((resolve, reject) => {
      fetch(
        `https://contributor-graph-api.apiseven.com/monthly-contributor?repo=${repo}`
      )
        .then(response => {
          if (!response.ok) {
            onDelete(repo);
            let message = "";
            switch (response.status) {
              case 403:
                message = "Hit rate limit";
                break;
              case 404:
                message = "Repo format error / Repo not found";
                break;
              default:
                message = "Request Error";
                break;
            }
            throw message;
          }
          return response.json();
        })
        .then(myJson => {
          resolve({ repo, ...myJson });
        })
        .catch(e => {
          showAlert(e, "error");
          reject();
        });
    });
  };

  const updateChart = repo => {
    if (dataSource[repo]) return;
    setLoading(true);
    fetchData(repo)
      .then(myJson => {
        const { Contributors = [] } = myJson;
        const data = Contributors.map(item => ({
          repo,
          contributorNum: item.Num,
          date: item.Month
        }));

        const clonedDatasource = cloneDeep(dataSource);
        if (!clonedDatasource[repo]) {
          setDataSource({ ...clonedDatasource, ...{ [repo]: data } });
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  };

  React.useEffect(() => {
    updateSeries(xAxis);
    window.parent.postMessage({ legend: Object.keys(dataSource) }, "*");
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
      console.log("deleteList: ", deleteList);
      const clonedDatasource = cloneDeep(dataSource);
      setDataSource(omit(clonedDatasource, deleteList));
      return;
    }

    const updateList = repoList.filter(item => !datasourceList.includes(item));
    setLoading(true);
    Promise.all(updateList.map(item => fetchData(item)))
      .then(data => {
        const tmpDataSouce = {};
        data.forEach(item => {
          const { Contributors = [], repo } = item;

          const data = Contributors.map(item => ({
            repo,
            contributorNum: item.Num,
            date: item.Month
          }));

          if (!tmpDataSouce[item.repo]) {
            tmpDataSouce[repo] = data;
          }
        });

        const clonedDatasource = cloneDeep(dataSource);
        setDataSource({ ...clonedDatasource, ...tmpDataSouce });
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [repoList]);

  return (
    <>
      <div
        className="content"
        style={{
          display: "flex",
          justifyContent: "center"
        }}
      >
        <div className="right" style={{ width: "90%", marginTop: "10px" }}>
          <div id="chart">
            <Tab.Container defaultActiveKey="contributor">
              <Row>
                <Col>
                  <Tab.Content>
                    <Tab.Pane eventKey="contributor">
                      <ReactECharts
                        option={option}
                        opts={{ renderer: "svg" }}
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

export default ActivityChart;
