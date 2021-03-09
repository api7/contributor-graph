import React from 'react';
// import { useEffect, useState } from 'react';
import { cloneDeep } from "lodash";
import { FormControl, InputGroup, ListGroup, Button } from "react-bootstrap";
import ReactECharts from "echarts-for-react";
// import { CopyToClipboard } from "react-copy-to-clipboard";

import 'bootstrap/dist/css/bootstrap.min.css';

// import './App.css';
const getMonths = (month = 12) => {
  const d = new Date();
  const result = [];
  for (let i = 0; i < month; i++) {
      d.setMonth(d.getMonth() - 1);
      const m = d.getMonth() + 1;
      const month = m < 10 ? `0${m}` : m;
      result.push(`${d.getFullYear()}-${month}`);
  }
  return result.sort();
};

const DEFAULT_OPTIONS = {
  title: {
      text: "Contributor Growth Curve",
  },
  tooltip: {
      trigger: "axis",
  },
  legend: {
      data: [],
  },
  toolbox: {
      feature: {
          saveAsImage: {},
      },
  },
  grid: {
      left: "3%",
      right: "4%",
      bottom: "3%",
      containLabel: true,
  },
  xAxis: [
      {
          type: "category",
          boundaryGap: false,
          data: [],
      },
  ],
  yAxis: [
      {
          type: "value",
      },
  ],
  series: [],
};

function App() {
  // const { host } = '';
  const [loading, setLoading] = React.useState(false);
  const [dataSource, setDataSource] = React.useState(
      {}
  );
  const [activeDate, setActiveDate] = React.useState("1year");
  const [xAxis, setXAxis] = React.useState([]);
  const [legendData, setLegendData] = React.useState([]);
  const [option, setOption] = React.useState(DEFAULT_OPTIONS);

  // const router = useRouter();
  const updateSeries = (xAxis) => {
      const newClonedOption = cloneDeep(option);
      const tmpLegendData = [];
      Object.keys(dataSource || {}).map(key => {
          const repo = key;
          const filteredData = [];
          const data = dataSource[key] || [];
          if (!tmpLegendData.includes(key)) {
              tmpLegendData.push(key);
          }

          xAxis.map(item => {
              const index = data.findIndex(_item => {
                  return (
                      new Date(_item.date).getTime() >
                      new Date(item).getTime()
                  );
              });
              if (index !== -1 && data[index - 1]) {
                  filteredData.push({
                      date: item,
                      contributorNum: data[index - 1].contributorNum,
                  });
              }
          });

          const findIndex = newClonedOption.series.findIndex(
              (item) => item.name === repo
          );
          if (findIndex === -1) {
              newClonedOption.series = [
                  ...newClonedOption.series,
                  {
                      name: repo,
                      type: "line",
                      smooth: true,
                      data: filteredData.map(item => item.contributorNum),
                  },
              ];
          } else {
              newClonedOption.series[findIndex] = {
                  name: repo,
                  type: "line",
                  smooth: true,
                  data: filteredData.map(item => item.contributorNum),
              };
          }
      });
      newClonedOption.xAxis[0] = {
          type: "category",
          boundaryGap: false,
          data: xAxis,
      };
      newClonedOption.legend.data = tmpLegendData;
      newClonedOption.legend.data = legendData;
      setOption(newClonedOption);
  };

  const getData = (repo) => {
      setLoading(true);
      if (!legendData.includes(repo)) {
          setLegendData(legendData.concat(repo));
      }

      fetch(`http://40.73.74.111:8080/contributors?repo=${repo}`)
          .then(response => response.json())
          .then(myJson => {
              const { contributors = [] } = myJson;
              const data = contributors.map((item) => ({
                  contributorNum: item.idx,
                  date: item.date
              }));
              // 计算当前月份的贡献者人数
              setLoading(false);

              const clonedDatasource = cloneDeep(dataSource);
              if (!clonedDatasource[repo]) {
                  setDataSource({ ...clonedDatasource, ...{ [repo]: data } });
              }
          });
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
          default:
              break;
      }
  }, [activeDate]);

  React.useEffect(() => {
      updateSeries(xAxis);
  }, [dataSource, xAxis]);

  React.useEffect(() => {
      // const { type, repo = "" } = router.query;
      // const repoArr = repo.split(",");
      // if (type === "contributor" && repo) {
      //     repoArr.map(item => {
      //         getData(item);
      //     });
      // }
  }, []);

  const [selectedType, setSelectedType] = React.useState("#contributor");
  const [repo, setRepo] = React.useState("");

  return (
    <>
    <div
        className="content"
        style={{
            display: "flex",
            width: "80%",
            marginLeft: "10%",
            flexDirection: "row",
            minHeight: "700px",
            justifyContent: "space-between",
        }}
    >
        <div className="left" style={{ marginTop: "200px" }}>
            <ListGroup defaultActiveKey={selectedType}>
                <ListGroup.Item
                    action
                    href="#contributor"
                    onClick={() => setSelectedType("#contributor")}
                >
                    Contributor Growth Curve
                </ListGroup.Item>
                <ListGroup.Item
                    action
                    href="#activity"
                    onClick={() => setSelectedType("#activity")}
                    disabled
                >
                    活跃度曲线
                </ListGroup.Item>
            </ListGroup>
        </div>
        <div
            className="right"
            style={{ width: "80%", marginTop: "2%" }}
        >
            <div
                className="search-container"
                style={{ display: "flex", justifyContent: "center" }}
            >
                <InputGroup>
                    <FormControl
                        placeholder="apache/apisix"
                        aria-label="apache/apisix"
                        aria-describedby="apache/apisix"
                        value={repo}
                        onChange={e => {
                            setRepo(e.target.value);
                        }}
                    />
                    <InputGroup.Append>
                        <Button
                            variant="primary"
                            onClick={async () => {
                                await getData(repo);
                            }}
                        >
                            Add
                        </Button>
                        <>
                            <Button
                                variant="danger"
                                onClick={() => {
                                    setLegendData([""]);
                                    setOption(DEFAULT_OPTIONS);
                                }}
                            >
                                clear
                            </Button>
                            {/* <CopyToClipboard
                                text={`${host}?type=contributor&repo=${legendData.join(',')}`} onCopy={(_, result) => { }}
                            >
                                <Button variant="success">share</Button>
                            </CopyToClipboard> */}
                        </>
                    </InputGroup.Append>
                </InputGroup>
            </div>
            <div id="chart" style={{ marginTop: "5%" }}>
                <div style={{ marginBottom: "10px" }}>
                    <Button
                        variant="outline-primary" value="1month" active={activeDate === '1month'} onClick={(e) => {
                            setActiveDate(e.currentTarget.value);
                        }}
                    >
                        1 month
                    </Button>{" "}
                    <Button
                        variant="outline-primary" value="3months" active={activeDate === '3months'} onClick={(e) => {
                            setActiveDate(e.currentTarget.value);
                        }}
                    >
                        3 months
                    </Button>{" "}
                    <Button
                        variant="outline-primary" value="6months" active={activeDate === '6months'}
                        onClick={(e) => {
                            setActiveDate(e.currentTarget.value);
                        }}
                    >6 months
                    </Button>
                    {' '}
                    <Button
                        variant="outline-primary" value="1year" active={activeDate === '1year'} onClick={(e) => {
                            setActiveDate(e.currentTarget.value);
                        }}
                    >
                        1 year
                    </Button>{" "}
                </div>
                <ReactECharts
                    option={option}
                    style={{ height: 700 }}
                    showLoading={loading}
                    notMerge
                />
            </div>
        </div>
    </div>
</>
  );
}

export default App;
