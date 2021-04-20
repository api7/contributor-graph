import React from "react";
import { makeStyles } from "@material-ui/core/styles";
import Grid from "@material-ui/core/Grid";

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

export default function CompareComponent({ list = [], onDelete, onConfirm }) {
  const classes = useStyles();

  return (
    <div className={classes.root}>
      <Grid container spacing={1} style={{ height: "100%" }}>
        <Chips
          list={list}
          onDelete={e => {
            onDelete(e);
          }}
        />
      </Grid>
    </div>
  );
}
