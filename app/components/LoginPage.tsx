import React from 'react';
import Avatar from '@material-ui/core/Avatar';
import Button from '@material-ui/core/Button';
import CssBaseline from '@material-ui/core/CssBaseline';
import TextField from '@material-ui/core/TextField';
import LockOutlinedIcon from '@material-ui/icons/LockOutlined';
import Typography from '@material-ui/core/Typography';
import { makeStyles } from '@material-ui/core/styles';
import Container from '@material-ui/core/Container';
import { makeRequest } from '../utils';
import { Redirect, useLocation } from 'react-router';
import routes from '../constants/routes';
import { CrowdaqUIContext, UpdateCrowdaqUIContext } from '../crowdaq/context';
import produce from 'immer';


const useStyles = makeStyles((theme) => ({
  paper: {
    marginTop: theme.spacing(8),
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  },
  avatar: {
    margin: theme.spacing(1),
    backgroundColor: theme.palette.secondary.main
  },
  form: {
    width: '100%', // Fix IE 11 issue.
    marginTop: theme.spacing(1)
  },
  submit: {
    margin: theme.spacing(3, 0, 2)
  }
}));

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

function useStickyState(defaultValue: string, key: string): [string, (x: string) => any] {
  const [value, setValue] = React.useState(() => {
    const stickyValue = window.localStorage.getItem(key);
    console.log(`LS->${key}=${stickyValue}`);
    return stickyValue !== null
      ? stickyValue
      : defaultValue;
  });
  React.useEffect(() => {
    window.localStorage.setItem(key, value);
  }, [key, value]);
  return [value, setValue];
}


export default function LoginPage() {
  const classes = useStyles();

  const appState = React.useContext(CrowdaqUIContext);
  const setAppState = React.useContext(UpdateCrowdaqUIContext);

  const query = useQuery();

  const [endpoint, setEndpoint] = useStickyState('https://api.crowdaq.com/apiV2', 'auth-endpoint');
  const [baseUrl, setBaseUrl] = useStickyState('https://dev2.crowdaq.com', 'auth-baseUrl');

  const [username, setUsernameLocal] = useStickyState('', 'auth-username');
  const [password, setPassword] = useStickyState('', 'auth-password');

  function tryLogin() {
    makeRequest(endpoint, 'login', { username, password }).then(
      resp => {
        const { token } = resp.data;

        // window.localStorage.setItem('auth-token', token);
        // window.localStorage.setItem('auth-username', username);
        // window.localStorage.setItem('auth-endpoint', endpoint);

        console.log({
          endpoint,
          baseUrl,
          username,
          password
        });

        const nextState = produce(appState, draftState => {
          draftState.endpoint = endpoint;
          draftState.baseUrl = baseUrl;
          draftState.username = username;
          draftState.password = password;
          draftState.token = token;
        });
        setAppState(nextState);

      }
    ).catch(error => {

      const nextState = produce(appState, draftState => {
        draftState.endpoint = endpoint;
        draftState.baseUrl = baseUrl;
        draftState.username = username;
        draftState.password = '';
        draftState.token = '';
      });
      setAppState(nextState);
    });
  }


  if (appState.token !== '') {
    const to = query.get('to');
    if (to === null || to === undefined || to === '') {
      return <Redirect to={routes.HOME} />;
    } else {
      return <Redirect to={to} />;
    }

  }


  return (
    <Container component="main" maxWidth="xs">
      <CssBaseline />
      <div className={classes.paper}>
        <Avatar className={classes.avatar}>
          <LockOutlinedIcon />
        </Avatar>
        <Typography component="h1" variant="h5">
          Sign in
        </Typography>
        <div className={classes.form}>
          <TextField
            variant="outlined"
            margin="normal"
            required
            fullWidth
            id="email"
            label="API Endpoint"
            name="email"
            autoFocus
            value={endpoint}
            onChange={e => setEndpoint(e.target.value)}
          />

          <TextField
            variant="outlined"
            margin="normal"
            required
            fullWidth
            id="email"
            label="Website Base Url"
            value={baseUrl}
            onChange={e => setBaseUrl(e.target.value)}
          />

          <TextField
            variant="outlined"
            margin="normal"
            required
            fullWidth
            label="Username"
            value={username}
            onChange={e => setUsernameLocal(e.target.value)}
          />
          <TextField
            variant="outlined"
            margin="normal"
            required
            fullWidth
            name="password"
            label="Password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            color="primary"
            className={classes.submit}
            onClick={(e) => tryLogin()}
          >
            Sign In
          </Button>
        </div>
      </div>

    </Container>
  );
}
