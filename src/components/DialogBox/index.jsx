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
import { handleShareToTwitterClick } from "../../utils";
import { Snackbar, makeStyles } from "@material-ui/core";
import Alert from "@material-ui/lab/Alert";
import DialogContentText from '@material-ui/core/DialogContentText';

export const DialogBox = ({ params = "" }) => {

  const useStyles = makeStyles(() => ({
    root: {
      backgroundColor: '#e53e3e',
      color: '#fff',
      border: 'none',
      padding: '0 10px',
      textTransform: 'none',
      margin: '0 0 10px 10px',
      lineHeight: '2.25rem',
      '&:hover': {
        backgroundColor: '#c53030'
      }
    },
    color: {
      color: '#3e434a',
      backgroundColor: '#F3F4F5',
      border: '1px solid #E0E0E0',
      textTransform: 'none',
      margin: '0 0 10px 10px'
    }
  }));
  const classes = useStyles();
  const SHARE_BASE_URL = "https://git-contributor.com/";
  const value = `<iframe style={{ width: "100%", height: "auto" , minWidth: "600px", minHeight: "1000px" }} src="${SHARE_BASE_URL}${params}" frameBorder="0"></iframe>`
  const [, setEmbedcopy] = useClipboard(value, { successDuration: 3000 })
  const [, setMCopied] = useClipboard(`${SHARE_BASE_URL}${params}`, { successDuration: 3000 });
  const [showNotice, setShowNotice] = React.useState(false);
  const [showEmbedModal, setShowEmbedModal] = React.useState(false);
  const [activeDate, setActiveDate] = React.useState("Link");

  const SearchButton = () => (
    <Button
      className={classes.root}
      value="Copy"
      style={{ padding: '5px 20px', textTransform: 'none', position: 'absolute', bottom: '10px', right: '20px', }}
      onClick={(e) => {
        setEmbedcopy();
        setShowNotice(true);
        setActiveDate(e.currentTarget.value)
      }}
    >
      Copy
    </Button>
  );
  return (
    <div>
      <Snackbar
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        autoHideDuration={6000}
        open={showNotice}
        onClose={() => setShowNotice(false)}
        key={"topcenter"}
      >
        <Alert severity='success' onClose={() => setShowNotice(false)}>
          Copy {activeDate === 'Copy' ? 'Embed' : 'Link'} successfully
        </Alert>
      </Snackbar>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'flex-end',
          margin: '20px 0 40px 0',
        }}
      >
        <Button
          className={classes.color}
          size="small"
          value="image"
          startIcon={<GetAppIcon />}
          onClick={() => {
            saveAs(`https://contributor-overtime-api.apiseven.com/contributors-svg${params}`, 'text.svg')
          }}
        >
          Image
        </Button>
        <Button
          className={classes.color}
          variant="outlined"
          size="small"
          value="Embed"
          startIcon={<CodeIcon />}
          onClick={() => setShowEmbedModal(true)}
        >
          Embed
        </Button>
        <Button
          className={classes.color}
          variant="outlined"
          size="small"
          value="Link"
          startIcon={<FilterNoneOutlinedIcon />}
          onClick={(e) => {
            setMCopied();
            setShowNotice(true);
            setActiveDate(e.currentTarget.value)
          }}
        >
          Link
        </Button>
        <Button
          className={classes.root}
          size="small"
          value="Share on twtter"
          startIcon={<svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 512 512" height="0.9em" width="0.9em" xmlns="http://www.w3.org/2000/svg"><path width='1.8em' height='1.8em' d="M459.37 151.716c.325 4.548.325 9.097.325 13.645 0 138.72-105.583 298.558-298.558 298.558-59.452 0-114.68-17.219-161.137-47.106 8.447.974 16.568 1.299 25.34 1.299 49.055 0 94.213-16.568 130.274-44.832-46.132-.975-84.792-31.188-98.112-72.772 6.498.974 12.995 1.624 19.818 1.624 9.421 0 18.843-1.3 27.614-3.573-48.081-9.747-84.143-51.98-84.143-102.985v-1.299c13.969 7.797 30.214 12.67 47.431 13.319-28.264-18.843-46.781-51.005-46.781-87.391 0-19.492 5.197-37.36 14.294-52.954 51.655 63.675 129.3 105.258 216.365 109.807-1.624-7.797-2.599-15.918-2.599-24.04 0-57.828 46.782-104.934 104.934-104.934 30.213 0 57.502 12.67 76.67 33.137 23.715-4.548 46.456-13.32 66.599-25.34-7.798 24.366-24.366 44.833-46.132 57.827 21.117-2.273 41.584-8.122 60.426-16.243-14.292 20.791-32.161 39.308-52.628 54.253z"></path></svg>}
          onClick={() => {
            handleShareToTwitterClick(params);
          }}
        >
          Share on Twtter
        </Button>
      </div>
      <Dialog
        fullWidth='fullWidth'
        open={showEmbedModal}
        onClose={() => setShowEmbedModal(false)}
        aria-labelledby="responsive-dialog-title"
      >
        <DialogActions style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #c4c4c4' }}>
          <DialogTitle size="small" style={{ padding: '5px' }}>Emeb Chart</DialogTitle>
          <Button onClick={() => setShowEmbedModal(false)} color="warning" size="large">
            <CloseIcon />
          </Button>
        </DialogActions>
        <DialogContentText style={{ fontSize: '15px', margin: '10px 15px 15px ' }}>Copy and paste the below codes into your blog or website</DialogContentText>
        <TextField
          multiline
          rows={6}
          value={value}
          variant="outlined"
          style={{ width: '95%', margin: '0 auto 10px', padding: '0', fontSize: '10px', wordBreak: 'break-all' }}
          InputProps={{ endAdornment: <SearchButton /> }}
        />
      </Dialog>
    </div>
  );
}
