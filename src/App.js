import React from "react";
import { cloneDeep } from "lodash";
import {
  FormControl,
  InputGroup,
  Button,
  ButtonGroup,
  Row,
  Col,
  Tab,
} from "react-bootstrap";
import ReactECharts from "echarts-for-react";
import { ToastContainer, toast } from "react-toastify";
import { CopyToClipboard } from "react-copy-to-clipboard";

import "react-toastify/dist/ReactToastify.css";

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

const getParameterByName = (name, url = window.location.href) => {
  name = name.replace(/[\[\]]/g, "\\$&");
  var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
    results = regex.exec(url);
  if (!results) return null;
  if (!results[2]) return "";
  return decodeURIComponent(results[2].replace(/\+/g, " "));
};

const TOAST_CONFIG = {
  position: "top-center",
  autoClose: 5000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  progress: undefined,
};

const DEFAULT_OPTIONS = {
  legend: {
    top: "5%",
    data: [],
  },
  toolbox: {
    feature: {
      saveAsImage: {},
    },
  },
  dataset: [],
  title: {
    text: "Contributor Over Time",
  },
  tooltip: {
    trigger: "axis",
  },
  xAxis: {
    type: "time",
    nameLocation: "middle",
  },
  yAxis: {
    name: "",
  },
  series: [],
};

function App() {
  const [loading, setLoading] = React.useState(false);
  const [dataSource, setDataSource] = React.useState({});
  const [activeDate, setActiveDate] = React.useState("max");
  const [xAxis, setXAxis] = React.useState([]);
  const [legendData, setLegendData] = React.useState([]);
  const [option, setOption] = React.useState(DEFAULT_OPTIONS);
  const [repo, setRepo] = React.useState("apache/apisix");

  const updateSeries = (passXAxis) => {
    const newClonedOption = cloneDeep(DEFAULT_OPTIONS);
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
      encode: {
        x: "Date",
        y: "ContributorNum",
        itemName: "Repo",
        tooltip: ["ContributorNum"],
      },
    }));

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

  const getData = (repo) => {
    setLoading(true);
    if (!legendData.includes(repo)) {
      setLegendData(legendData.concat(repo));
    }

    return new Promise((resolve, reject) => {
      fetch(
        `https://contributor-graph-api.apiseven.com/contributors?repo=${repo}`
      )
        .then((response) => {
          console.log("response: ", response);
          return response.json();
        })
        .then((myJson) => {
          console.log("myJson: ", myJson);
          const { Contributors = [] } = myJson;
          const data = Contributors.map((item) => ({
            repo,
            contributorNum: item.idx,
            date: item.date,
          }));
          setLoading(false);

          const clonedDatasource = cloneDeep(dataSource);
          if (!clonedDatasource[repo]) {
            setDataSource({ ...clonedDatasource, ...{ [repo]: data } });
          }
          resolve();
        })
        .catch((e) => {
          toast.error("Request Error", TOAST_CONFIG);
          setLoading(false);
          reject();
        });
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
      case "max":
        setXAxis(["1970-01-01"]);
        break;
      default:
        break;
    }
  }, [activeDate]);

  React.useEffect(() => {
    updateSeries(xAxis);
  }, [dataSource, xAxis]);

  React.useEffect(() => {
    const repo = getParameterByName("repo");
    if (repo) {
      const repoArr = repo.split(",").filter(Boolean);
      repoArr.forEach((item) => {
        getData(item);
      });
    }
  }, []);

  return (
    <>
      <ToastContainer />
      <link
        rel="stylesheet"
        href="https://static.apiseven.com/bootstrap.min.css"
      />
      <div
        className="content"
        style={{ display: "flex", justifyContent: "center" }}
      >
        <div className="right" style={{ width: "90%", marginTop: "10px" }}>
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
                onChange={(e) => {
                  setRepo(e.target.value);
                }}
              />
              <InputGroup.Append></InputGroup.Append>
            </InputGroup>
            <>
              <Button
                variant="primary"
                onClick={() => {
                  getData(repo);
                }}
              >
                Add
              </Button>{" "}
              <Button
                variant="danger"
                onClick={() => {
                  setLegendData([""]);
                  setOption(DEFAULT_OPTIONS);
                  setDataSource({});
                }}
              >
                Clear
              </Button>{" "}
              <CopyToClipboard
                text={`${window.location.protocol +
                  "//" +
                  window.location.host +
                  window.location.pathname}?repo=${legendData.join(",")}`}
                onCopy={(_, result) => {
                  toast.success("Copy Success", TOAST_CONFIG);
                }}
              >
                <Button variant="success">share</Button>
              </CopyToClipboard>
            </>
          </div>
          <div id="chart" style={{ marginTop: "30px" }}>
            <Tab.Container defaultActiveKey="contributor">
              <Row>
                <Col>
                  <Tab.Content>
                    <Tab.Pane eventKey="contributor">
                      <div style={{ marginBottom: "5px" }}>
                        <ButtonGroup size="sm">
                          <Button
                            variant="outline-primary"
                            value="1month"
                            active={activeDate === "1month"}
                            onClick={(e) => {
                              setActiveDate(e.currentTarget.value);
                            }}
                          >
                            1 Month
                          </Button>{" "}
                          <Button
                            variant="outline-primary"
                            value="3months"
                            active={activeDate === "3months"}
                            onClick={(e) => {
                              setActiveDate(e.currentTarget.value);
                            }}
                          >
                            3 Months
                          </Button>{" "}
                          <Button
                            variant="outline-primary"
                            value="6months"
                            active={activeDate === "6months"}
                            onClick={(e) => {
                              setActiveDate(e.currentTarget.value);
                            }}
                          >
                            6 Months
                          </Button>{" "}
                          <Button
                            variant="outline-primary"
                            value="1year"
                            active={activeDate === "1year"}
                            onClick={(e) => {
                              setActiveDate(e.currentTarget.value);
                            }}
                          >
                            1 Year
                          </Button>{" "}
                          <Button
                            variant="outline-primary"
                            value="max"
                            active={activeDate === "max"}
                            onClick={(e) => {
                              setActiveDate(e.currentTarget.value);
                            }}
                          >
                            Max
                          </Button>{" "}
                        </ButtonGroup>
                      </div>
                      <ReactECharts
                        option={option}
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
}

export default App;
