import React, { useLayoutEffect } from "react";
import { makeStyles, Paper, Snackbar } from "@material-ui/core";
import TextField from "@material-ui/core/TextField";
import MuiAlert from "@material-ui/lab/Alert";
import Autocomplete from "@material-ui/lab/Autocomplete";
import Tabs from "@material-ui/core/Tabs";
import Tab from "@material-ui/core/Tab";
import PropTypes from "prop-types";
import Typography from "@material-ui/core/Typography";
import Box from "@material-ui/core/Box";
import IconButton from "@material-ui/core/IconButton";
import InputAdornment from "@material-ui/core/InputAdornment";
import SearchIcon from "@material-ui/icons/Search";
import cloneDeep from "lodash.clonedeep";

import Footer from './components/Footer';
import ContirbutorLineChart from "./components/contributor";
import ActivityChart from "./components/activity";
import { getParameterByName, inIframe } from "./utils";
import CompareComponent from "./components/compare";
import { DEFAULT_CONTAINER_STYLE, DEFAULT_SEARCHBAR_STYLE } from "./constants";

const Alert = (props) => {
  return <MuiAlert elevation={6} variant="filled" {...props} />;
};

const useStyles = makeStyles((theme) => ({
  button: {
    margin: theme.spacing(1),
  },
  textField: {
    marginLeft: theme.spacing(1),
    marginRight: theme.spacing(1),
    width: "50ch",
  },
  searchTextField: {
    margin: 0,
  },
  root: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    width: "100%",
  },
  autocomplete: {
    flex: 1,
    paddingTop: "5px",
  },
  iconButton: {
    padding: 10,
  },
  divider: {
    height: 28,
    margin: 4,
  },
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
  value: PropTypes.any.isRequired,
};

function a11yProps(index) {
  return {
    id: `scrollable-force-tab-${index}`,
    "aria-controls": `scrollable-force-tabpanel-${index}`,
  };
}

const App = () => {
  const [repo, setRepo] = React.useState("apache/apisix");
  const [message, setMessage] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [alertType, setAlertType] = React.useState("success");
  const [searchOption, setSearchOption] = React.useState([]);
  const [contributorRepoList, setContributorRepoList] = React.useState([]);
  const [value, setValue] = React.useState(0);
  const [tabdisabled, setTabDisabled] = React.useState(false);
  const [size, setSize] = React.useState([0, 0]);
  const [searchStyle, setSearchStyle] = React.useState(DEFAULT_SEARCHBAR_STYLE);
  const [containerStyle, setContainerStyle] = React.useState(
    DEFAULT_CONTAINER_STYLE
  );

  // handle screen resize
  useLayoutEffect(() => {
    function updateSize() {
      setSize([window.innerWidth, window.innerHeight]);
    }
    window.addEventListener("resize", updateSize);
    updateSize();
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  React.useEffect(() => {
    const width = size[0];
    if (width > 996) {
      setContainerStyle(DEFAULT_CONTAINER_STYLE);
      setSearchStyle(DEFAULT_SEARCHBAR_STYLE);
    } else {
      setContainerStyle({ ...containerStyle, width: "100%" });
      setSearchStyle({ ...searchStyle, width: "80%" });
    }
  }, [size]);

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  const classes = useStyles();

  const showAlert = (message = "", type = "success") => {
    if (typeof (message === "object" && type === "error")) {
      message = "Request Error";
    }
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

  const updateChart = (repo) => {
    if (!contributorRepoList.includes(repo)) {
      setContributorRepoList([...contributorRepoList, repo]);
    }
  };

  const getSearchOptions = () => {
    fetch(`https://contributor-overtime-api.apiseven.com/repos?`, {
      method: "GET",
      headers: {
        Accept: "application/vnd.github.v3+json",
      },
    })
      .then(function (response) {
        return response.json();
      })
      .then((data) => {
        setSearchOption(data.Repos || []);
      })
      .catch((e) => {
        console.log("e: ", e);
      });
  };

  React.useEffect(() => {
    getSearchOptions();
    const repo = getParameterByName("repo") || "apache/apisix";
    const repoArr = repo.split(",").filter(Boolean);
    setContributorRepoList(repoArr);

    const chart = getParameterByName("chart");
    if (chart === "contributorMonthlyActivity") {
      setValue(1);
    } else {
      setValue(0);
    }
  }, []);

  React.useEffect(() => {
    window.parent.postMessage(
      {
        chartType:
          value === 0 ? "contributorOverTime" : "contributorMonthlyActivity",
      },
      "*"
    );
  }, [value]);

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
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {!inIframe() &&
          <div
          className="titleBox"
          style={{
            margin: '30px 0',
            display: "block",
          }}
        >
          <h1 style={{ fontSize: '2em', textAlign: 'center' }}>Contributor Over Time</h1>
        </div>}
        <div style={searchStyle}>
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
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Search Github Repository Name"
                  margin="normal"
                  variant="outlined"
                  helperText="Keep searching to complete the comparison"
                  className={classes.searchTextField}
                  onChange={(e) => {
                    setRepo(e.target.value);
                  }}
                  onKeyPress={(ev) => {
                    if (ev.key === "Enter") {
                      updateChart(repo);
                      ev.preventDefault();
                    }
                  }}
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <InputAdornment>
                        <IconButton
                          onClick={() => {
                            updateChart(repo);
                          }}
                        >
                          <SearchIcon />
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              )}
            />
          </Paper>
          <div>
            <CompareComponent
              list={contributorRepoList}
              onDelete={(e) => {
                const clonedContributorRepoList =
                  cloneDeep(contributorRepoList);
                const newContributorRepoList = clonedContributorRepoList.filter(
                  (item) => item !== e
                );
                setContributorRepoList(newContributorRepoList);
              }}
            />
          </div>
        </div>
        <div className="right" style={containerStyle}>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <div
              className="search-container"
              style={{
                display: "flex",
                justifyContent: "center",
                flexDirection: "column",
              }}
            ></div>
          </div>

          <div>
            <div
              style={{
                width: "90%",
                display: "flex",
                justifyContent: "left",
                padding: "5px",
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
                showAlert={showAlert}
                onLoading={(e) => {
                  setTabDisabled(e);
                }}
                onDelete={(e) => {
                  setContributorRepoList(
                    contributorRepoList.filter((item) => item !== e)
                  );
                }}
              />
            </TabPanel>
            <TabPanel value={value} index={1}>
              <ActivityChart
                repoList={contributorRepoList}
                showAlert={showAlert}
                onLoading={(e) => {
                  setTabDisabled(e);
                }}
                onDelete={(e) => {
                  setContributorRepoList(
                    contributorRepoList.filter((item) => item !== e)
                  );
                }}
              />
            </TabPanel>
          </div>
        </div>
        { !inIframe() && <Footer />}
      </div>
    </>
  );
};

export default App;
