import React from "react";
import cloneDeep from "lodash.clonedeep";
import omit from "lodash.omit";
import { Row, Col, Tab } from "react-bootstrap";
import ReactECharts from "echarts-for-react";
import { CopyToClipboard } from "react-copy-to-clipboard";

import {
  Button,
  ButtonGroup,
  makeStyles,
  Paper,
  Divider,
  IconButton,
  InputBase,
  Snackbar
} from "@material-ui/core";
import SearchIcon from "@material-ui/icons/Search";
import MenuIcon from "@material-ui/icons/Menu";
import ShareIcon from "@material-ui/icons/Share";
import MuiAlert from "@material-ui/lab/Alert";

import Chips from "./components/chip";

function Alert(props) {
  return <MuiAlert elevation={6} variant="filled" {...props} />;
}

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
  // eslint-disable-next-line
  name = name.replace(/[\[\]]/g, "\\$&");
  var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
    results = regex.exec(url);
  if (!results) return null;
  if (!results[2]) return "";
  return decodeURIComponent(results[2].replace(/\+/g, " "));
};

const DEFAULT_OPTIONS = {
  legend: {
    top: "5%",
    data: []
  },
  toolbox: {
    feature: {
      saveAsImage: {}
    }
  },
  dataset: [],
  title: {
    text: "Contributor Over Time"
  },
  tooltip: {
    trigger: "axis"
  },
  xAxis: {
    type: "time",
    nameLocation: "middle"
  },
  yAxis: {
    name: ""
  },
  series: []
};

const useStyles = makeStyles(theme => ({
  button: {
    margin: theme.spacing(1)
  },
  textField: {
    marginLeft: theme.spacing(1),
    marginRight: theme.spacing(1),
    width: "50ch"
  },
  root: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    width: 600
  },
  input: {
    marginLeft: theme.spacing(1),
    flex: 1
  },
  iconButton: {
    padding: 10
  },
  divider: {
    height: 28,
    margin: 4
  }
}));

function App() {
  const [loading, setLoading] = React.useState(false);
  const [dataSource, setDataSource] = React.useState({});
  const [activeDate, setActiveDate] = React.useState("max");
  const [xAxis, setXAxis] = React.useState([]);
  const [option, setOption] = React.useState(DEFAULT_OPTIONS);
  const [repo, setRepo] = React.useState("apache/apisix");
  const [message, setMessage] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [alertType, setAlertType] = React.useState("success");

  const classes = useStyles();

  const showAlert = (message = "", type = "success") => {
    setMessage(message);
    setAlertType(type);
    setOpen(true);
  };
  const handleClose = (event, reason) => {
    if (reason === "clickaway") {
      return;
    }

    setOpen(false);
  };

  const updateSeries = passXAxis => {
    const newClonedOption = cloneDeep(DEFAULT_OPTIONS);
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
        `https://contributor-graph-api.apiseven.com/contributors?repo=${repo}`
      )
        .then(response => {
          return response.json();
        })
        .then(myJson => {
          setLoading(false);
          resolve({ repo, ...myJson });
        })
        .catch(e => {
          showAlert("Request Error", "error");
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
        contributorNum: item.idx,
        date: item.date
      }));

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
      Promise.all(repoArr.map(item => fetchData(item))).then(data => {
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
      });
    } else {
      updateChart("apache/apisix");
    }
  }, []);

  return (
    <>
      <Snackbar
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
        autoHideDuration={6000}
        open={open}
        onClose={handleClose}
        key={"topcenter"}
      >
        <Alert severity={alertType} onClose={handleClose}>
          {message}
        </Alert>
      </Snackbar>
      <div
        className="content"
        style={{ display: "flex", justifyContent: "center" }}
      >
        <div className="right" style={{ width: "90%", marginTop: "10px" }}>
          <div
            className="search-container"
            style={{ display: "flex", justifyContent: "center" }}
          >
            <Paper component="form" className={classes.root}>
              <IconButton className={classes.iconButton} aria-label="menu">
                <MenuIcon />
              </IconButton>
              <InputBase
                className={classes.input}
                placeholder="apache/apisix"
                value={repo}
                onChange={e => {
                  setRepo(e.target.value);
                }}
                onKeyPress={ev => {
                  if (ev.key === "Enter") {
                    updateChart(repo);
                    ev.preventDefault();
                  }
                }}
                inputProps={{ "aria-label": "search repo" }}
              />
              <IconButton className={classes.iconButton} aria-label="search">
                <SearchIcon
                  onClick={() => {
                    updateChart(repo);
                  }}
                />
                <Divider className={classes.divider} orientation="vertical" />
              </IconButton>

              <CopyToClipboard
                text={
                  window.location !== window.parent.location
                    ? `https://www.apiseven.com/en/contributor-graph?repo=${option.legend.data.join(
                        ","
                      )}`
                    : `${window.location.protocol +
                        "//" +
                        window.location.host +
                        window.location
                          .pathname}?repo=${option.legend.data.join(",")}`
                }
                onCopy={(_, result) => {
                  if (result) {
                    showAlert("Copy Successfully", "success");
                  } else {
                    showAlert("Copy Failed", "error");
                  }
                }}
              >
                <IconButton
                  color="primary"
                  className={classes.iconButton}
                  aria-label="share"
                >
                  <ShareIcon />
                </IconButton>
              </CopyToClipboard>
            </Paper>
          </div>
          <div style={{ marginTop: "10px" }}>
            <Chips
              list={Object.keys(dataSource)}
              onDelete={e => {
                const newDataSource = omit(dataSource, [e]);
                setDataSource(newDataSource);
              }}
            />
          </div>
          <div id="chart" style={{ marginTop: "30px" }}>
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
                            active={activeDate === "max"}
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
