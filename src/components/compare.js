import React from "react";
import { makeStyles } from "@material-ui/core/styles";
import Grid from "@material-ui/core/Grid";

import Chips from "./chip";

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
    flexWrap: "wrap",
    flexGrow: 1,
    "& > *": {
      margin: "0 0 8px 0",
      width: "100%",
      height: theme.spacing(8),
    },
  },
}));

export default function CompareComponent({ list = [], onDelete }) {
  const classes = useStyles();

  return (
    <div className={classes.root}>
      <Grid container spacing={1} style={{ height: "100%" }}>
        <Chips
          list={list}
          onDelete={(e) => {
            onDelete(e);
          }}
        />
      </Grid>
    </div>
  );
}
