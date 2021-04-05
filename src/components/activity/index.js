import React from "react";
import cloneDeep from "lodash.clonedeep";
import { Row, Col, Tab } from "react-bootstrap";
import * as echarts from "echarts";
import ReactECharts from "echarts-for-react";
import omit from "lodash.omit";

import CompareComponent from "../compare";
import { DEFAULT_ACTIVITY_OPTIONS } from "../../constants";

const ActivityChart = ({ repoList = ["apache/apisix"], showAlert }) => {
  const [loading, setLoading] = React.useState(false);
  const [dataSource, setDataSource] = React.useState({});
  const [xAxis,] = React.useState(["1970-01-01"]);
  const [option, setOption] = React.useState(DEFAULT_ACTIVITY_OPTIONS);

  const updateSeries = passXAxis => {
    const newClonedOption = cloneDeep(DEFAULT_ACTIVITY_OPTIONS);
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
            color: "rgba(58,77,233,0.8)"
          },
          {
            offset: 1,
            color: "rgba(58,77,233,0.1)"
          }
        ])
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
    setLoading(true);

    return new Promise((resolve, reject) => {
      fetch(
        `https://contributor-graph-api.apiseven.com/monthly-contributor?repo=${repo}`
      )
        .then(response => {
          if (!response.ok) {
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
          setLoading(false);
          resolve({ repo, ...myJson });
        })
        .catch(e => {
          showAlert(e, "error");
          setLoading(false);
          reject();
        });
    });
  };

  const updateChart = repo => {
    if (dataSource[repo]) return;

    fetchData(repo).then(myJson => {
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
    });
  };

  React.useEffect(() => {
    updateSeries(xAxis);
    window.parent.postMessage({ legend: Object.keys(dataSource) }, "*");
  }, [dataSource, xAxis]);

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

    Promise.all(updateList.map(item => fetchData(item))).then(data => {
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
          <div style={{ marginTop: "10px" }}>
            <CompareComponent
              list={Object.keys(dataSource)}
              onDelete={e => {
                const newDataSource = omit(dataSource, [e]);
                setDataSource(newDataSource);
              }}
              onConfirm={e => {
                if (!e) return;
                updateChart(e);
              }}
            />
          </div>
          <div id="chart" style={{ marginTop: "30px" }}>
            <Tab.Container defaultActiveKey="contributor">
              <Row>
                <Col>
                  <Tab.Content>
                    <Tab.Pane eventKey="contributor">
                      <div
                        style={{
                          display: "flex",
                          marginBottom: "5px",
                          justifyContent: "space-between",
                          alignItems: "center"
                        }}
                      >
                      </div>
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
                        style={{ height: 700, width: "100%" }}
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
