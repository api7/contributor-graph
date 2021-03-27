import React from "react";
import { makeStyles } from "@material-ui/core/styles";
import Paper from "@material-ui/core/Paper";
import Grid from "@material-ui/core/Grid";
import Button from "@material-ui/core/Button";
import TextField from "@material-ui/core/TextField";

import Chips from "./chip";

const useStyles = makeStyles(theme => ({
  root: {
    display: "flex",
    flexWrap: "wrap",
    flexGrow: 1,
    "& > *": {
      margin: theme.spacing(1),
      width: "100%",
      height: theme.spacing(8)
    }
  }
}));

export default function ComparePaper({ list = [], onDelete }) {
  const classes = useStyles();

  return (
    <div className={classes.root}>
      <Grid container spacing={1} style={{ height: "100%" }}>
        <Button
          variant="contained"
          color="primary"
          style={{ marginRight: "10px" }}
          disabled
        >
          多仓库对比
        </Button>
        <Chips
          list={list}
          onDelete={e => {
            onDelete(e);
          }}
        />
        <TextField
          variant="outlined"
          placeholder="Add to Compare"
          size="small"
          style={{ with: "70px" }}
        ></TextField>
        <Button
          variant="contained"
          color="primary"
          style={{ marginLeft: "10px" }}
        >
          Confirm
        </Button>
      </Grid>
    </div>
  );
}
