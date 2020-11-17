/* eslint react/jsx-props-no-spreading: off */
import React from 'react';
import { Switch, Route, Redirect } from 'react-router-dom';
import routes from './constants/routes';
import App from './containers/App';
import HomePage from './containers/HomePage';
import LoginPage from './components/LoginPage';
import { CrowdaqInstructions } from './components/crowdaq/Instruction';
import { CrowdaqTutorial } from './components/crowdaq/Tutorial';
import { CrowdaqExamPage, CrowdaqExams } from './components/crowdaq/Exam';
import { CrowdaqTaskset, CrowdaqTasksets } from './components/crowdaq/Task';
import { MturkAccountPage } from './components/mturk/MturkPage';
import { CrowdaqUIContext } from './crowdaq/context';
import jwt from 'jsonwebtoken'

// Lazily load routes and code split with webpack
const LazyCounterPage = React.lazy(() =>
  import(/* webpackChunkName: "CounterPage" */ './containers/CounterPage')
);

const CounterPage = (props: Record<string, any>) => (
  <React.Suspense fallback={<h1>Loading...</h1>}>
    <LazyCounterPage {...props} />
  </React.Suspense>
);


export const WithLogin: React.FunctionComponent<any> = (props: any) => {
  // @ts-ignore
  // const isLogin = useSelector(getLoginState);
  const appState = React.useContext(CrowdaqUIContext)
  const decoded = jwt.decode(appState.token);
  console.log(decoded);
  const isLogin = appState.token !== '';

  if (isLogin) {
    return <React.Fragment>
      {props.children}
    </React.Fragment>;
  } else {
    return <Redirect to={`${routes.LOGIN}?to=${props.path}`} />;

  }
};


export default function Routes() {
  return (
    <Switch>
      <Route path={routes.HOME} exact>
        <WithLogin path={routes.HOME}><HomePage /></WithLogin>
      </Route>
      <Route path={routes.LOGIN}>
        <LoginPage />
      </Route>

      <Route path={routes.Instructions} exact>
        <CrowdaqInstructions />
      </Route>

      <Route path={routes.Tutorials} exact>
        <CrowdaqTutorial />
      </Route>

      <Route path={routes.Exams} exact>
        <CrowdaqExams />
      </Route>

      <Route path={routes.Exam}>
        <CrowdaqExamPage />
      </Route>

      <Route path={routes.Tasksets} exact>
        <CrowdaqTasksets />
      </Route>

      <Route path={routes.Taskset} exact>
        <CrowdaqTaskset />
      </Route>

      <Route path={routes.Mturk}>
        <MturkAccountPage />
      </Route>

      <Route path={routes.ClientTasks}>
        <MturkAccountPage />
      </Route>

    </Switch>
  );
}
