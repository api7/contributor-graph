import React from "react";
import { makeStyles } from "@material-ui/core/styles";
import Chip from "@material-ui/core/Chip";
import Link from "@material-ui/core/Link";
import GitHubIcon from "@material-ui/icons/GitHub";

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
    flexWrap: "wrap",
    "& > *": {
      margin: theme.spacing(0.5),
    },
    "& > a": {
      cursor: "pointer",
    }
  },
}));

export default function OutlinedChips({ list = [], onDelete }) {
  const classes = useStyles();

  return (
    <div className={classes.root}>
      {list.map((item) => (
        <Link href={`https://github.com/${item}`} target="_blank" rel="noreferrer noopener">
        <Chip
          icon={<GitHubIcon />}
          label={item}
          key={item}
          size="small"
          onDelete={() => onDelete(item)}
          color="primary"
          variant="outlined"
        />
        </Link>
      ))}
    </div>
  );
}
