import React from "react";
import { makeStyles, Paper, IconButton, Snackbar } from "@material-ui/core";
import TextField from "@material-ui/core/TextField";
import SearchIcon from "@material-ui/icons/Search";
import MuiAlert from "@material-ui/lab/Alert";
import Autocomplete from "@material-ui/lab/Autocomplete";

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

const App = () => {
  const [repo, setRepo] = React.useState("apache/apisix");
  const [message, setMessage] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [alertType, setAlertType] = React.useState("success");
  const [searchOption, setSearchOption] = React.useState([]);
  const [contributorRepoList, setContributorRepoList] = React.useState([]);
  // TODO: activity line
  const [chartType, setChartType] = React.useState("contributor");

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
          <ContirbutorLineChart
            repoList={contributorRepoList}
            showAlert={showAlert}
          />
        </div>
      </div>
    </>
  );
};

export default App;
