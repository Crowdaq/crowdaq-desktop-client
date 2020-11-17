import React from 'react';
import { Link, useHistory, useLocation } from 'react-router-dom';
import routes from '../constants/routes';
import { makeStyles } from '@material-ui/core/styles';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import Button from '@material-ui/core/Button';
import IconButton from '@material-ui/core/IconButton';
import MenuIcon from '@material-ui/icons/Menu';
import { Breadcrumbs } from '@material-ui/core';
import { Link as MuiLink } from '@material-ui/core';
import NavigateNextIcon from '@material-ui/icons/NavigateNext';
import { CrowdaqUIContext, UpdateCrowdaqUIContext } from '../crowdaq/context';
import { app } from 'electron';
import produce from 'immer';

const useStyles = makeStyles((theme) => ({
  root: {
    flexGrow: 1
  },
  menuButton: {
    marginRight: theme.spacing(2)
  },
  title: {
    color: '#eee',
    flexGrow: 1
  },
  activeCrumb: {
    color: theme.palette.primary.main
  },
  crumb: {
    color: 'inherit'
  },
  appbar: {
    backgroundColor: theme.palette.success.main
  }

}));


const LinkRouter = (props: any) => <MuiLink {...props} component={Link} />;


interface NamedLinkLoc {
  path: string,
  name: string
}


function mapToBCs(path: string): NamedLinkLoc[] {
  const parts = path.split('/');
  const ret: NamedLinkLoc[] = [];

  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];
    if (i === 1) {
      switch (part) {
        case 'exam':
          ret.push({ name: 'Exam', path: '/exam' });
          break;
        case 'taskset':
          ret.push({ name: 'Task Set', path: '/taskset' });
          break;
        case 'tutorial':
          ret.push({ name: 'Tutorial', path: '/tutorial' });
          break;
        case 'instruction':
          ret.push({ name: 'Instruction', path: '/instruction' });
          break;
        case 'mturk':
          ret.push({ name: 'Mturk Accounts', path: '/mturk' });
          break;
        default:
          ret.push({ name: part, path: `/${part}` });
      }
    } else if (i === 2) {
      ret.push({ name: part, path: `/${parts[1]}/${parts[2]}` });
    }
  }
  // console.log(parts);
  //
  // console.log(ret);
  return ret;
}


export default function AppHeader(): JSX.Element {
  const classes = useStyles();
  let history = useHistory();
  let location = useLocation();
  const setAppState = React.useContext(UpdateCrowdaqUIContext);

  const appState = React.useContext(CrowdaqUIContext);
  const updateHandler = React.useContext(UpdateCrowdaqUIContext);
  const isLogin = appState.token !== '';

  function doLogout() {

    window.localStorage.removeItem('auth-token');
    // window.localStorage.removeItem('auth-username');
    // window.localStorage.removeItem('auth-endpoint');

    const nextState = produce(appState, draftState => {
      draftState.token = '';
    });
    setAppState(nextState);

    history.push('/login');
  }

  let loginOrLogout;
  if (isLogin) {
    loginOrLogout = <Button
      color="inherit"
      onClick={doLogout}
    >Logout</Button>;
  } else {
    loginOrLogout = <Button
      component={Link}
      to={'/login'}
      color="inherit"
    >Sign In</Button>;
  }

  let homeButton;
  if (location.pathname !== '/') {
    homeButton = <Button
      className={classes.title}
      component={Link}
      to={routes.HOME}
      color="inherit"
    >Go To Homepage</Button>;
  } else {
    homeButton = <Typography variant="h6" className={classes.title}>
      Home
    </Typography>;
  }

  const crumbs = mapToBCs(location.pathname);

  let breadcrumbs = <Breadcrumbs
    aria-label="breadcrumb"
    className={classes.title}
    separator={<NavigateNextIcon fontSize="small" />}>
    <LinkRouter color="inherit" to="/">
      Home
    </LinkRouter>
    {crumbs.map((crumb, idx) => {
      return <LinkRouter
        key={idx}
        // color={idx === crumbs.length - 1 ? 'textSecondary' : 'inherit'}
        className={idx === crumbs.length - 1 ? classes.activeCrumb : classes.crumb}
        to={crumb.path}>
        {crumb.name}
      </LinkRouter>;
    })}

  </Breadcrumbs>;


  return (
    <div>
      <AppBar position="static" className={classes.appbar}>
        <Toolbar>
          <IconButton
            edge="start"
            className={classes.menuButton}
            component={Link}
            to={'/'}
            color="inherit" aria-label="menu">
            <MenuIcon />
          </IconButton>

          {breadcrumbs}

          {/*<Button onClick={() => {*/}
          {/*  console.log(JSON.stringify(appState, null, 4));*/}
          {/*}}>Log State</Button>*/}

          {loginOrLogout}

        </Toolbar>
      </AppBar>
    </div>
  );
}
