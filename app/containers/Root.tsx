import React from 'react';
import { Provider, useDispatch } from 'react-redux';
import { hot } from 'react-hot-loader/root';
import { History } from 'history';
import { Store } from '../store';
import Routes from '../Routes';
import AppHeader from '../components/AppHeader';
import { Container, CssBaseline } from '@material-ui/core';
import { ConnectedRouter } from 'connected-react-router';
import { createMuiTheme, ThemeProvider } from '@material-ui/core/styles';
import {
  CrowdaqAppState,
  CrowdaqUIContext,
  UpdateCrowdaqUIContext
} from '../crowdaq/context';
import { ipcRenderer } from 'electron';
import { ProgressUpdateArg, WorkerProgressUpdateChannel } from '../workerRequests';

const theme = createMuiTheme({
  palette: {
    primary: {
      main: '#264653'
    },
    secondary: {
      main: '#e9c46a'
    },
    success: {
      main: '#2a9d8f'
    },
    warning: {
      main: '#f4a261'
    },
    error: {
      main: '#e76f51'
    }
  }
});


type Props = {
  store: Store;
  history: History;
};

const Root = ({ store, history }: Props) => (
  <div>
    <CssBaseline />
    <ThemeProvider theme={theme}>
      <Provider store={store}>
        <ConnectedRouter history={history}>
          <AppRoot />
        </ConnectedRouter>
      </Provider>
    </ThemeProvider>

  </div>
);


function AppRoot(props: any) {
  const dispatch = useDispatch();

  // React.useEffect(() => {
  //   const token = window.localStorage.getItem('auth-token');
  //   const username = window.localStorage.getItem('auth-username');
  //   const endpoint = window.localStorage.getItem('auth-endpoint');
  //   if (token && username) {
  //     dispatch(setUsername(username));
  //     dispatch(setLogin(true));
  //     dispatch(setToken(token));
  //   }
  // }, []);

  const [appState, setAppState] = React.useState<CrowdaqAppState>({
    token: '',
    username: '',
    password: '',
    endpoint: '',
    baseUrl: '',
    tasks: []
  });

  const handlers = (newAppState: CrowdaqAppState) => {
    setAppState(newAppState);
  };

  React.useEffect(() => {
    ipcRenderer.on(WorkerProgressUpdateChannel, (event, args) => {
      const progressUpdate = args as ProgressUpdateArg;
      window.localStorage.setItem(progressUpdate.trackerId, JSON.stringify(progressUpdate));
    });
  }, []);


  return <CrowdaqUIContext.Provider value={appState}>
    <UpdateCrowdaqUIContext.Provider value={handlers}>
      <AppHeader />
      <Container>
        <Routes />
      </Container>
    </UpdateCrowdaqUIContext.Provider>
  </CrowdaqUIContext.Provider>;
}


export default hot(Root);
