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

import ContirbutorLineChart from "./components/contributor";
import { getParameterByName } from "./utils";

const Alert = props => {
  return <MuiAlert elevation={6} variant="filled" {...props} />;
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
      id={`vertical-tabpanel-${index}`}
      aria-labelledby={`vertical-tab-${index}`}
      {...other}
      style={{ width: "100%" }}
    >
      {value === index && (
        <Box p={6} style={{ padding: 0 }}>
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
    id: `vertical-tab-${index}`,
    "aria-controls": `vertical-tabpanel-${index}`
  };
}

const useStylesTable = makeStyles(theme => ({
  root: {
    flexGrow: 1,
    backgroundColor: theme.palette.background.paper,
    display: "flex",
    height: 224,
    marginTop: "2em"
  },
  tabs: {
    borderRight: `1px solid ${theme.palette.divider}`
  }
}));

const App = () => {
  const [repo, setRepo] = React.useState("apache/apisix");
  const [message, setMessage] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [alertType, setAlertType] = React.useState("success");
  const [searchOption, setSearchOption] = React.useState([]);
  const [contributorRepoList, setContributorRepoList] = React.useState([]);
  // TODO: activity line
  const [chartType, setChartType] = React.useState("contributor");
  const classesTable = useStylesTable();
  const [value, setValue] = React.useState(0);

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
    if (chartType === "contributor") {
      if (!contributorRepoList.includes(repo)) {
        setContributorRepoList([...contributorRepoList, repo]);
      }
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
    if (repo) {
      const repoArr = repo.split(",").filter(Boolean);
      setContributorRepoList(repoArr);
    } else {
      setContributorRepoList(["apache/apisix"]);
    }
    getSearchOptions();
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
            <Paper className={classes.root} elevation>
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
          </div>
          <div className={classesTable.root}>
            <Tabs
              orientation="vertical"
              variant="scrollable"
              value={value}
              onChange={handleChange}
              aria-label="Vertical tabs example"
              className={classesTable.tabs}
            >
              <Tab label="Contributor Over Time" {...a11yProps(0)} />
              <Tab label="活跃度图表" {...a11yProps(1)} />
            </Tabs>
            <TabPanel value={value} index={0}>
              <ContirbutorLineChart
                repoList={contributorRepoList}
                showAlert={showAlert}
              />
            </TabPanel>
            <TabPanel value={value} index={1}>
              活跃度图表
            </TabPanel>
          </div>
        </div>
      </div>
    </>
  );
};

export default App;
