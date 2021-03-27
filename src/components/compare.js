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

export default function ComparePaper({ list = [], onDelete, onConfirm }) {
  const classes = useStyles();
  const [inputText, setInputText] = React.useState("");

  return (
    <div className={classes.root}>
      <Grid container spacing={1} style={{ height: "100%" }}>
        <Chips
          list={list}
          onDelete={e => {
            onDelete(e);
          }}
        />
        <TextField
          variant="outlined"
          placeholder="➕ Add to Compare"
          size="small"
          style={{ with: "70px" }}
          value={inputText}
          onChange={e => {
            setInputText(e.currentTarget.value);
          }}
          onKeyPress={ev => {
            if (ev.key === "Enter") {
              onConfirm(inputText);
              ev.preventDefault();
            }
          }}
        ></TextField>
        <Button
          variant="contained"
          size="small"
          color="primary"
          style={{ marginLeft: "10px" }}
          onClick={() => {
            onConfirm(inputText);
          }}
        >
          Confirm
        </Button>
      </Grid>
    </div>
  );
}
