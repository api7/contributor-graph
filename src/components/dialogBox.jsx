import React from "react";
import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogTitle from '@material-ui/core/DialogTitle';
import CodeIcon from '@material-ui/icons/Code';
import CloseIcon from '@material-ui/icons/Close';
import TextField from '@material-ui/core/TextField';
import GetAppIcon from '@material-ui/icons/GetApp';
import FilterNoneOutlinedIcon from '@material-ui/icons/FilterNoneOutlined';
import useClipboard from "react-use-clipboard";
import { handleShareToTwitterClick } from "../utils";
import { Snackbar } from "@material-ui/core";
import Alert from "@material-ui/lab/Alert";
import DialogContentText from '@material-ui/core/DialogContentText';

export const DialogBox = ({ repoList = ["apache/apisix"], }) => {

  const title = window.location.href.includes("contributorOverTime")
    ? "contributor over time"
    : "monthly active contributor"
  const Url = window.location.href.split('repo=apache/apisix')
  const Tail = Url[1]
  const overTimegetShareParams = () => `?chart=contributorOverTime&repo=${repoList.join(",")}${Tail}`
  const monthlyActivegetShareParams = () => `?chart=contributorMonthlyActivity&repo=${repoList.join(",")}${Tail}`;
  const overTimevalue = `<iframe style={{ width: "100%", height: "auto" , minWidth: "600px", minHeight: "1000px" }} src="https://git-contributor.com/${overTimegetShareParams()}" frameBorder="0"></iframe>`
  const monthlyActivevalue = `<iframe style={{ width: "100%", height: "auto" , minWidth: "600px", minHeight: "1000px" }} src="https://git-contributor.com/${monthlyActivegetShareParams()}" frameBorder="0"></iframe>`
  const [, setEmOverTimecopy] = useClipboard(overTimevalue, { successDuration: 3000 })
  const [, setEmMonthlyActivecopy] = useClipboard(monthlyActivevalue, { successDuration: 3000 })
  const [, setMonthlyActiveCopied] = useClipboard(`https://git-contributor.com/${monthlyActivegetShareParams()}`, { successDuration: 3000 });
  const [, setOverTimeCopied] = useClipboard(`https://git-contributor.com/${overTimegetShareParams()}`, { successDuration: 3000 });
  const [openAlert, setOpenAlert] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [fullWidth,] = React.useState(true);

  const SearchButton = () => (
    <Button
      color="secondary"
      variant="contained"
      value="Copy"
      style={{ padding: '5px 20px', textTransform: 'none', position: 'absolute', bottom: '10px', right: '20px', backgroundColor: ' #E53E3E' }}
      onClick={handleiframeiframe}
    >
      Copy
    </Button>
  );
  const handleShareClick = () => {
    if (title === "contributor over time") {
      const params = overTimegetShareParams();
      handleShareToTwitterClick(params, repoList);
    } else {
      const params = monthlyActivegetShareParams();
      handleShareToTwitterClick(params, repoList);
    }
  }

  const handleCopyClick = () => {
    if (title === "contributor over time") {
      setOverTimeCopied()
      setOpenAlert(true);
    } else {
      setMonthlyActiveCopied();
      setOpenAlert(true);
    }
  }
  const handleDownloadClick = () => {
    if (title === "contributor over time") {
      const params = overTimegetShareParams();
      saveAs(`https://contributor-overtime-api.apiseven.com/contributors-svg${params}`, 'text.svg');
    } else {
      const params = monthlyActivegetShareParams();
      saveAs(`https://contributor-overtime-api.apiseven.com/contributors-svg${params}`, 'text.svg');
    }
  }
  const handleiframeiframe = () => {
    if (title === "contributor over time") {
      setEmOverTimecopy();
      setOpenAlert(true);
    } else {
      setEmMonthlyActivecopy();
      setOpenAlert(true);
    }
  }

  return (
    <div>
      <Snackbar
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        autoHideDuration={6000}
        open={openAlert}
        onClose={() => setOpenAlert(false)}
        key={"topcenter"}
      >
        <Alert severity='success' onClose={() => setOpenAlert(false)}>
          Copy link successfully
        </Alert>
      </Snackbar>
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          margin: '20px 0 40px 0',
        }}
      >
        <Button
          color="warning"
          variant="outlined"
          size="small"
          value="image"
          startIcon={<GetAppIcon />}
          style={{ marginRight: '10px', textTransform: 'none', }}
          onClick={handleDownloadClick}
        >
          Image
        </Button>
        <Button
          color="warning"
          variant="outlined"
          size="small"
          value="Embed"
          startIcon={<CodeIcon />}
          style={{ textTransform: 'none', marginRight: '10px' }}
          onClick={() => setOpen(true)}
        >
          Embed
        </Button>
        <Button
          color="warning"
          variant="outlined"
          size="small"
          value="Link"
          startIcon={<FilterNoneOutlinedIcon />}
          style={{ marginRight: '10px ', textTransform: 'none' }}
          onClick={handleCopyClick}
        >
          Link
        </Button>
        <Button
          color="secondary"
          variant="contained"
          size="small"
          value="Share on twtter"
          startIcon={<svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 512 512" height="0.9em" width="0.9em" xmlns="http://www.w3.org/2000/svg"><path width='1.8em' height='1.8em' d="M459.37 151.716c.325 4.548.325 9.097.325 13.645 0 138.72-105.583 298.558-298.558 298.558-59.452 0-114.68-17.219-161.137-47.106 8.447.974 16.568 1.299 25.34 1.299 49.055 0 94.213-16.568 130.274-44.832-46.132-.975-84.792-31.188-98.112-72.772 6.498.974 12.995 1.624 19.818 1.624 9.421 0 18.843-1.3 27.614-3.573-48.081-9.747-84.143-51.98-84.143-102.985v-1.299c13.969 7.797 30.214 12.67 47.431 13.319-28.264-18.843-46.781-51.005-46.781-87.391 0-19.492 5.197-37.36 14.294-52.954 51.655 63.675 129.3 105.258 216.365 109.807-1.624-7.797-2.599-15.918-2.599-24.04 0-57.828 46.782-104.934 104.934-104.934 30.213 0 57.502 12.67 76.67 33.137 23.715-4.548 46.456-13.32 66.599-25.34-7.798 24.366-24.366 44.833-46.132 57.827 21.117-2.273 41.584-8.122 60.426-16.243-14.292 20.791-32.161 39.308-52.628 54.253z"></path></svg>}
          style={{ textTransform: 'none', fontSize: '9px', backgroundColor: '#E53E3E' }}
          onClick={handleShareClick}
        >
          Share on twtter
        </Button>
      </div>
      <Dialog
        fullWidth={fullWidth}
        open={open}
        onClose={() => setOpen(false)}
        aria-labelledby="responsive-dialog-title"
      >
        <DialogActions style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #c4c4c4' }}>
          <DialogTitle size="small" style={{ padding: '5px' }}>Emeb Chart</DialogTitle>
          <Button onClick={() => setOpen(false)} color="warning" size="small" startIcon={<CloseIcon />} autoFocus>
          </Button>
        </DialogActions>
        <DialogContentText style={{ fontSize: '15px', margin: '10px 15px 15px ' }}>Copy and paste the below codes into your blog or website</DialogContentText>
        <TextField
          multiline
          rows={6}
          value={title === "contributorOverTime" ? overTimevalue : monthlyActivevalue}
          variant="outlined"
          style={{ width: '95%', margin: '0 auto 10px', padding: '0', fontSize: '10px', wordBreak: 'break-all' }}
          InputProps={{ endAdornment: <SearchButton /> }}
        />
      </Dialog>
    </div>
  );
}
