import React from "react";
import { makeStyles, Paper, IconButton, Snackbar } from "@material-ui/core";
import TextField from "@material-ui/core/TextField";
import SearchIcon from "@material-ui/icons/Search";
import MuiAlert from "@material-ui/lab/Alert";
import Autocomplete from "@material-ui/lab/Autocomplete";
import Tabs from "@material-ui/core/Tabs";
import Tab from "@material-ui/core/Tab";
import PropTypes from "prop-types";
import Typography from "@material-ui/core/Typography";
import Box from "@material-ui/core/Box";
import Button from "@material-ui/core/Button";

import ContirbutorLineChart from "./components/contributor";
import ActivityChart from "./components/activity";
import { getParameterByName } from "./utils";

const Alert = props => {
  return <MuiAlert elevation={6} variant="filled" {...props} />;
};

const ALLOW_MERGE_LIST = ["skywalking", "apisix"];

const useStyles = makeStyles(theme => ({
  button: {
    margin: theme.spacing(1)
  },
  textField: {
    marginLeft: theme.spacing(1),
    marginRight: theme.spacing(1),
    width: "50ch"
  },
  searchTextField: {
    margin: 0
  },
  root: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    width: 600
  },
  autocomplete: {
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

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`scrollable-force-tabpanel-${index}`}
      aria-labelledby={`scrollable-force-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box p={3} style={{ padding: 0 }}>
          <Typography>{children}</Typography>
        </Box>
      )}
    </div>
  );
}

TabPanel.propTypes = {
  children: PropTypes.node,
  index: PropTypes.any.isRequired,
  value: PropTypes.any.isRequired
};

function a11yProps(index) {
  return {
    id: `scrollable-force-tab-${index}`,
    "aria-controls": `scrollable-force-tabpanel-${index}`
  };
}

const useTabStyles = makeStyles(theme => ({
  root: {
    flexGrow: 1,
    width: "100%",
    backgroundColor: theme.palette.background.paper
  }
}));

const App = () => {
  const [repo, setRepo] = React.useState("apache/apisix");
  const [message, setMessage] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [alertType, setAlertType] = React.useState("success");
  const [searchOption, setSearchOption] = React.useState([]);
  const [contributorRepoList, setContributorRepoList] = React.useState([]);
  const classesTable = useTabStyles();
  const [value, setValue] = React.useState(0);
  const [tabdisabled, setTabDisabled] = React.useState(false);
  const [showMergeButton, setShowMergeButton] = React.useState(false);
  const [mergeStatus, setMergeStatus] = React.useState(false);

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

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

  const updateChart = repo => {
    if (!contributorRepoList.includes(repo)) {
      setContributorRepoList([...contributorRepoList, repo]);
    }
  };

  const getSearchOptions = () => {
    fetch(`https://contributor-graph-api.apiseven.com/repos?`, {
      method: "GET",
      headers: {
        Accept: "application/vnd.github.v3+json"
      }
    })
      .then(function(response) {
        return response.json();
      })
      .then(data => {
        setSearchOption(data.Repos || []);
      })
      .catch(e => {
        console.log("e: ", e);
      });
  };

  React.useEffect(() => {
    const repo = getParameterByName("repo");
    const chart = getParameterByName("chart");
    if (chart === "contributorMonthlyActivity") {
      setValue(1);
    }
    if (repo) {
      const repoArr = repo.split(",").filter(Boolean);
      setContributorRepoList(repoArr);
    } else {
      setContributorRepoList(["apache/apisix"]);
    }
    getSearchOptions();
  }, []);

  React.useEffect(() => {
    window.parent.postMessage(
      {
        chartType:
          value === 0 ? "contributorOverTime" : "contributorMonthlyActivity"
      },
      "*"
    );
  }, [value]);

  React.useEffect(() => {
    const index = ALLOW_MERGE_LIST.findIndex(item => repo.includes(item));
    if (index !== -1) {
      setShowMergeButton(true);
    } else {
      setShowMergeButton(false);
    }
    if (contributorRepoList.length === 0) {
      setShowMergeButton(false);
    }
  }, [repo, contributorRepoList]);

  React.useEffect(() => {
    if (mergeStatus) {
      if (repo.includes("skywalking")) {
        setContributorRepoList(["apache/skywalking"]);
      }
      if (repo.includes("apisix")) {
        setContributorRepoList(["apache/apisix"]);
      }
    } else {
      if (repo.includes("skywalking")) {
        setContributorRepoList(["apache/skywalking"]);
      }
      if (repo.includes("apisix")) {
        setContributorRepoList(["apache/apisix"]);
      }
    }
  }, [mergeStatus]);
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
          <div style={{ display: "flex", justifyContent: "center" }}>
            <div
              className="search-container"
              style={{
                display: "flex",
                justifyContent: "center",
                flexDirection: "column"
              }}
            >
              <Paper className={classes.root} elevation={0}>
                <Autocomplete
                  freeSolo
                  className={classes.autocomplete}
                  size="small"
                  id="autocomplete"
                  disableClearable
                  options={searchOption}
                  onInputChange={(event, value, reason) => {
                    if (reason === "reset") {
                      setRepo(value);
                      updateChart(value);
                    }
                  }}
                  renderInput={params => (
                    <TextField
                      {...params}
                      label="Search Github Repository Name"
                      margin="normal"
                      variant="outlined"
                      helperText="Keep searching to complete the comparison"
                      className={classes.searchTextField}
                      onChange={e => {
                        setRepo(e.target.value);
                      }}
                      onKeyPress={ev => {
                        if (ev.key === "Enter") {
                          updateChart(repo);
                          ev.preventDefault();
                        }
                      }}
                      InputProps={{ ...params.InputProps, type: "search" }}
                    />
                  )}
                />
                <IconButton
                  className={classes.iconButton}
                  aria-label="search"
                  onClick={() => {
                    updateChart(repo);
                  }}
                >
                  <SearchIcon />
                </IconButton>
              </Paper>
              {Boolean(showMergeButton) && (
                <Button
                  variant="contained"
                  color="primary"
                  size="small"
                  onClick={() => {
                    setMergeStatus(!mergeStatus);
                  }}
                  style={{ width: "260px" }}
                >
                  {Boolean(!mergeStatus)
                    ? `View all views related to ${
                        repo.includes("skywalking")
                          ? "apache/skywalking"
                          : "apache/apisix"
                      }`
                    : "Cancel merge view"}
                </Button>
              )}
            </div>
          </div>

          <div className={classesTable.root} style={{ marginTop: "20px" }}>
            <div
              style={{
                width: "100%",
                display: "flex",
                justifyContent: "center"
              }}
            >
              <Paper color="default" elevation={0}>
                <Tabs
                  value={value}
                  onChange={handleChange}
                  variant="scrollable"
                  scrollButtons="on"
                  indicatorColor="primary"
                  textColor="primary"
                  aria-label="scrollable force tabs example"
                >
                  <Tab
                    style={{ textTransform: "none" }}
                    label="Contributor Over Time"
                    {...a11yProps(0)}
                    disabled={tabdisabled}
                  />
                  <Tab
                    style={{ textTransform: "none" }}
                    label="Monthly Active Contributors"
                    {...a11yProps(1)}
                    disabled={tabdisabled}
                  />
                </Tabs>
              </Paper>
            </div>
            <TabPanel value={value} index={0}>
              <ContirbutorLineChart
                repoList={contributorRepoList}
                mode={!mergeStatus ? "normal" : "merge"}
                showAlert={showAlert}
                onLoading={e => {
                  setTabDisabled(e);
                }}
                onDelete={e => {
                  setContributorRepoList(
                    contributorRepoList.filter(item => item !== e)
                  );
                }}
              />
            </TabPanel>
            <TabPanel value={value} index={1}>
              <ActivityChart
                repoList={contributorRepoList}
                showAlert={showAlert}
                onLoading={e => {
                  setTabDisabled(e);
                }}
                onDelete={e => {
                  setContributorRepoList(
                    contributorRepoList.filter(item => item !== e)
                  );
                }}
              />
            </TabPanel>
          </div>
        </div>
      </div>
    </>
  );
};

export default App;
