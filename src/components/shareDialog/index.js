import React from "react";
import { withStyles } from "@material-ui/core/styles";
import Dialog from "@material-ui/core/Dialog";
import MuiDialogTitle from "@material-ui/core/DialogTitle";
import MuiDialogContent from "@material-ui/core/DialogContent";
import IconButton from "@material-ui/core/IconButton";
import CloseIcon from "@material-ui/icons/Close";
import Typography from "@material-ui/core/Typography";
import Paper from "@material-ui/core/Paper";
import Grid from "@material-ui/core/Grid";
import { makeStyles } from "@material-ui/core/styles";
import Button from "@material-ui/core/Button";
import TextField from "@material-ui/core/TextField";
import Tooltip from "@material-ui/core/Tooltip";
import copy from "copy-to-clipboard";
import SyntaxHighlighter from "react-syntax-highlighter/dist/esm/default-highlight";
import { a11yDark } from "react-syntax-highlighter/dist/esm/styles/hljs";
import useClipboard from "react-use-clipboard";

import { inIframe } from "../../utils";
import "./index.css";

const styles = (theme) => ({
  root: {
    margin: 0,
    padding: theme.spacing(2),
  },
  closeButton: {
    position: "absolute",
    right: theme.spacing(1),
    top: theme.spacing(1),
    color: theme.palette.grey[500],
  },
});

const SHARE_BASE_URL = "https://git-contributor.com";
const IMG_BASE_URL =
  "https://contributor-overtime-api.git-contributor.com/contributors-svg";

const ShareLink = ({ params = "" }) => {
  return (
    <>
      <div style={{ marginTop: "50px", marginBottom: "10px" }}>
        <div style={{ display: "flex", marginBottom: "30px" }}>
          <TextField
            id="standard-basic"
            label="Share Link"
            variant="outlined"
            className="shareInput"
            value={`${SHARE_BASE_URL}${params}`}
            size="small"
            style={{ width: "400px", borderRadius: "0px" }}
          />
          <Button
            variant="contained"
            color="primary"
            style={{ borderRadius: "0px" }}
            onClick={() => {
              copy(SHARE_BASE_URL + params);
            }}
          >
            Copy
          </Button>
        </div>
        <div style={{ display: "flex" }}>
          <TextField
            label="Image Link"
            variant="outlined"
            className="shareInput"
            value={`${IMG_BASE_URL}${params}`}
            size="small"
            style={{ width: "400px" }}
          />
          <Button
            variant="contained"
            color="primary"
            style={{ borderRadius: "0px" }}
            onClick={() => {
              copy(IMG_BASE_URL + params);
            }}
          >
            Copy
          </Button>
        </div>
      </div>
    </>
  );
};

function ShareModal({ params = "" }) {
  const useStyles = makeStyles((theme) => ({
    root: {
      flexGrow: 1,
    },
    paper: {
      padding: 0,
      textAlign: "center",
      color: theme.palette.text.secondary,
    },
  }));
  const classes = useStyles();
  const shareUrl = SHARE_BASE_URL + params;
  const shareText = params.includes("contributorMonthlyActivity")
    ? "monthly active contributor"
    : "contributor over time";

  return (
    <div className={classes.root}>
      <Grid container spacing={3}>
        <Grid item xs={2}>
          <Paper
            className={classes.paper}
            elevation={0}
            style={{ cursor: "pointer" }}
            onClick={() => {
              if (!inIframe()) {
                const text = `Amazing tools to view your repo ${shareText}`;
                const newUrl = encodeURIComponent(shareUrl);
                window.open(`https://twitter.com/intent/tweet?text=${text}&url=${newUrl}`, '_blank');
              }
              window.parent.postMessage(
                {
                  share: {
                    to: "twitter",
                    url: shareUrl,
                  },
                },
                "*"
              );
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                marginBottom: "8px",
              }}
            >
              <svg
                viewBox="0 0 60 60"
                preserveAspectRatio="xMidYMid meet"
                focusable="false"
                class="style-scope yt-icon"
                style={{
                  pointerEvents: "none",
                  display: "block",
                  width: "60px",
                  height: "60px",
                }}
              >
                <g class="style-scope yt-icon">
                  <g
                    fill="none"
                    fill-rule="evenodd"
                    class="style-scope yt-icon"
                  >
                    <path
                      d="M28.486325 59.969298c-6.636404-.569063-11.56302-2.326956-16.321973-5.823932C4.443764 48.472116 0 39.646792 0 29.986934 0 15.11156 10.506778 2.798388 25.274412.36718c6.028107-.992411 12.703853.049265 18.28794 2.85363 13.576275 6.818095 19.7813 22.541053 14.64267 37.103159-3.527955 9.997705-12.789708 17.617785-23.391072 19.244938-2.085625.320112-5.065149.508645-6.327625.400391z"
                      fill="#1DA1F2"
                      fill-rule="nonzero"
                      class="style-scope yt-icon"
                    ></path>
                    <path
                      d="M45.089067 17.577067c-.929778.595555-3.064534 1.460977-4.117334 1.460977v.001778C39.7696 17.784 38.077156 17 36.200178 17c-3.645511 0-6.6016 2.956089-6.6016 6.600178 0 .50631.058666 1.000178.16711 1.473778h-.001066c-4.945066-.129778-10.353422-2.608356-13.609244-6.85049-2.001778 3.46489-.269511 7.3184 2.002133 8.72249-.7776.058666-2.209067-.0896-2.882844-.747023-.045156 2.299734 1.060622 5.346845 5.092622 6.452267-.776533.417778-2.151111.297956-2.7488.209067.209778 1.941333 2.928355 4.479289 5.901155 4.479289C22.46009 38.565156 18.4736 40.788089 14 40.080889 17.038222 41.929422 20.5792 43 24.327111 43c10.650667 0 18.921956-8.631822 18.4768-19.280356-.001778-.011733-.001778-.023466-.002844-.036266.001066-.027378.002844-.054756.002844-.0832 0-.033067-.002844-.064356-.003911-.096356.9696-.66311 2.270578-1.836089 3.2-3.37991-.539022.296888-2.156089.891377-3.6608 1.038932.965689-.521244 2.396444-2.228266 2.749867-3.585777"
                      fill="#FFF"
                      class="style-scope yt-icon"
                    ></path>
                  </g>
                </g>
              </svg>
            </div>
            <span style={{ width: "1.3rem" }}>Twitter</span>
          </Paper>
        </Grid>
      </Grid>
    </div>
  );
}

const DialogTitle = withStyles(styles)((props) => {
  const { children, classes, onClose, ...other } = props;
  return (
    <MuiDialogTitle disableTypography className={classes.root} {...other}>
      <Typography variant="h6">{children}</Typography>
      {onClose ? (
        <IconButton
          aria-label="close"
          className={classes.closeButton}
          onClick={onClose}
        >
          <CloseIcon />
        </IconButton>
      ) : null}
    </MuiDialogTitle>
  );
});

const DialogContent = withStyles((theme) => ({
  root: {
    padding: theme.spacing(2),
  },
}))(MuiDialogContent);

export const MarkdownLink = ({ params = "", type = "contributorOverTime" }) => {
  const title =
    type === "contributorOverTime"
      ? "Contributor Over Time"
      : "Monthly Active Contributors";

  const value = `
### ${title}

[![${title}](${IMG_BASE_URL + params})](${SHARE_BASE_URL + params})`;

  const [isCopied, setCopied] = useClipboard(value, { successDuration: 3000 });

  return (
    <div>
      <p>
        You can include the chart on your repository's README.md as follows:
      </p>
      <div style={{ display: "flex" }}>
        <SyntaxHighlighter language="markdown" style={a11yDark}>
          {`
### ${title}

[![${title}](${IMG_BASE_URL + params})](${SHARE_BASE_URL + params})`}
        </SyntaxHighlighter>
        <div
          style={{
            margin: "16px 0 16px 0",
            backgroundColor: "#2b2b2b",
            cursor: "pointer",
          }}
          onClick={setCopied}
        >
          {isCopied ? (
            <Tooltip title="Copied!" placement="top" arrow>
              <img width="28px" height="28px" src="/icon/copy-done.svg" />
            </Tooltip>
          ) : (
            <img width="28px" height="28px" src="/icon/copy.svg" />
          )}
        </div>
      </div>
    </div>
  );
};

export default function CustomizedDialogs({
  open = false,
  onChange = () => { },
  params = "",
}) {
  const handleClose = () => {
    onChange(false);
  };
  return (
    <div>
      <Dialog
        onClose={handleClose}
        aria-labelledby="customized-dialog-title"
        open={open}
      >
        <DialogTitle id="customized-dialog-title" onClose={handleClose}>
          Share
        </DialogTitle>
        <DialogContent dividers>
          <ShareModal params={params} />
          <ShareLink params={params} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
