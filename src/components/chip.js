import React from "react";
import { makeStyles } from "@material-ui/core/styles";
import Chip from "@material-ui/core/Chip";
import GitHubIcon from "@material-ui/icons/GitHub";

const useStyles = makeStyles(theme => ({
  root: {
    display: "flex",
    flexWrap: "wrap",
    "& > *": {
      margin: theme.spacing(0.5)
    }
  }
}));

export default function OutlinedChips({ list = [], onDelete }) {
  const classes = useStyles();

  return (
    <div className={classes.root}>
      {list.map(item => (
        <Chip
          icon={<GitHubIcon />}
          label={item}
          key={item}
          size="small"
          onDelete={() => onDelete(item)}
          color="primary"
          variant="outlined"
        />
      ))}
    </div>
  );
}
