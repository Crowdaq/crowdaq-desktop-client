import React from 'react';
import { useSelector } from 'react-redux';
import { CrowdaqListing, LinearProgressWithLabel } from './Utils';
import {
  Button,
  Card,
  CardActions,
  Container,
  Divider,
  FormControl,
  Grid,
  InputLabel, MenuItem, Select,
  TextField
} from '@material-ui/core';
import TableContainer from '@material-ui/core/TableContainer';
import Paper from '@material-ui/core/Paper';
import Table from '@material-ui/core/Table';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import TableCell from '@material-ui/core/TableCell';
import TableBody from '@material-ui/core/TableBody';
import { Link } from 'react-router-dom';
import { useParams } from 'react-router';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import { CrowdaqUIContext } from '../../crowdaq/context';
import { ProgressUpdateArg, startPublishTask, startSyncTask, TaskProgress } from '../../workerRequests';
import {
  AWSCredProfile, createMTurkClient,
  getObjectFolder,
  openFolder,
  ProdCommonQuals,
  readStatus,
  SandboxCommonQuals,
  Status
} from '../../utils';
import { makeStyles } from '@material-ui/core/styles';
import { CreateHITRequest, GetAccountBalanceResponse, QualificationRequirement } from 'aws-sdk/clients/mturk';
import moment from 'moment';
import { MturkAccountSelector } from '../mturk/MturkPage';
import { MturkCreateHitConfigurator } from '../mturk/Qualifications';

const { ipcRenderer } = require('electron');

const useStyles = makeStyles((theme) => ({

  card: {
    padding: theme.spacing(2),
    marginTop: theme.spacing(2)
  },

  column: {
    marginTop: theme.spacing(2)
  }
}));

export const CrowdaqTasksets: React.FunctionComponent<{}> = (props) => {
  const appState = React.useContext(CrowdaqUIContext);

  const owner = appState.username;

  return <div>
    <h1>TaskSets</h1>
    <CrowdaqListing fn={'annotation_taskset.list'} filter={{ owner }} itemDisplayComponent={CrowdaqTaskSetDisplays} />
  </div>;
};

const CrowdaqTaskSetDisplays: React.FunctionComponent<{ items: any[] }> = (props) => {
  return <TableContainer component={Paper}>
    <Table aria-label="simple table">
      <TableHead>
        <TableRow>
          <TableCell>TaskSet Name</TableCell>
          <TableCell align="left">Actions</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {props.items.map((item, idx) => {
          return <CrowdaqTaskSetRow key={item._id} {...item} />;
        })}
      </TableBody>
    </Table>
  </TableContainer>;
};


const CrowdaqTaskSetRow: React.FunctionComponent<any> = (props) => {

  const { owner, annotation_taskset_id } = props;

  // function sendDownloadRequest() {
  //
  //   const arg = {
  //     type: 'download-taskset',
  //     payload: {
  //       owner, annotation_taskset_id
  //     }
  //   };
  //
  //   ipcRenderer.send('worker-request', arg);
  //   // ipcRenderer.sendTo()
  // }

  return <TableRow>
    <TableCell>{props.owner}/{props.annotation_taskset_id}</TableCell>
    <TableCell align="left">
      <Button
        component={Link}
        to={`/taskset/${props.annotation_taskset_id}`}
        color="inherit"
      >Open</Button>
      {/*<Button color="inherit" onClick={sendDownloadRequest}>Download</Button>*/}
    </TableCell>
  </TableRow>;
};

export const CrowdaqTaskset: React.FunctionComponent<{}> = (props) => {
  let { id } = useParams();
  const appState = React.useContext(CrowdaqUIContext);
  const classes = useStyles();

  const owner = appState.username;
  const [value, setValue] = React.useState(0);

  const handleChange = (event: any, newValue: number) => {
    setValue(newValue);
  };

  const taskURL = `https://dev2.crowdaq.com/w/task/${owner}/${id}`;
  let currentTab;

  switch (value) {
    case 0:
      currentTab = <PublishTaskset />;
      break;
    case 1:
      currentTab = <TasksetAssignments />;
      break;
    case 2:
      currentTab = <TasksetDownload />;
      break;
  }


  async function synNow() {
    const { endpoint, username, password, token } = appState;
    await startSyncTask({
      currentAppState: appState, taskset_id: id, trackerId
    });
  }

  async function handleOpenFolder() {
    const dest = await getObjectFolder(appState, 'taskset', owner, id);
    await openFolder(dest);
  }

  const [status, setStatus] = React.useState<Status>({ lastUpdate: '', message: '', status: 'empty' });

  async function refreshStatus() {
    const dest = await getObjectFolder(appState, 'taskset', owner, id);
    const status = await readStatus(dest);
    setStatus(status);
  }

  const [progress, setProgress] = React.useState<TaskProgress>({
    lastUpdateTime: '',
    progressCurrent: 0,
    progressText: '',
    progressTotal: 0,
    status: ''
  });

  const trackerId = `task-syncing-${owner}-${id}`;

  function checkForWorkerProgress() {
    const item = localStorage.getItem(trackerId);
    console.log('progress:');

    if (item) {
      try {
        const p = JSON.parse(item) as ProgressUpdateArg;
        if (p.progress.status === 'finished') {
          refreshStatus();
        }
        setProgress(p.progress);
      } catch (e) {
        console.log('Failed.');
      }
    }
  }

  React.useEffect(() => {
    refreshStatus();
    window.addEventListener('storage', checkForWorkerProgress);

    return () => {
      window.removeEventListener('storage', checkForWorkerProgress);
    };
  }, []);

  let statusDisplay;

  switch (status.status) {
    case 'empty':
      statusDisplay = <div>Taskset has not been synced</div>;
      break;
    case 'error':
      statusDisplay = <div>Error: ${status.message}</div>;
      break;
    case 'finished':
      statusDisplay = <div>Taskset syncing finished.</div>;
      break;
    case 'syncing':
      statusDisplay = <div>Taskset syncing in progress.</div>;
      break;
    default:
      throw new Error('');
  }

  let progressDisplay;

  if (progress.progressText !== '') {
    switch (progress.status) {
      case 'running':
        progressDisplay = <React.Fragment>
          <LinearProgressWithLabel value={progress.progressCurrent * 100 / progress.progressTotal} />
          {progress.progressText}
        </React.Fragment>;
        break;
      case 'finished':
        progressDisplay = <React.Fragment>
          {progress.progressText}
        </React.Fragment>;
    }

  }

  return <Grid container>
    <Grid item xs={12}>
      <h1>
        Taskset: {owner}/{id}
      </h1>
    </Grid>

    <Grid item xs={12}>
      <Button variant={'outlined'} onClick={synNow}>Sync now</Button>
      <Button variant={'outlined'} onClick={handleOpenFolder}>Open folder</Button>
    </Grid>

    <Grid item xs={12} className={classes.column}>
      <Button
        onClick={refreshStatus}
        variant={'outlined'}>Refresh Status</Button>
      {statusDisplay}
      <div>Last update time: {status.lastUpdate}</div>
    </Grid>

    <Grid item xs={12} className={classes.column}>
      {progressDisplay}
    </Grid>

    <Grid item xs={12}>
      <Tabs
        value={value}
        indicatorColor="primary"
        textColor="primary"
        onChange={handleChange}
      >
        <Tab label="Publish To Mturk" />
      </Tabs>
      <Card className={classes.card}>
        {currentTab}
      </Card>
    </Grid>


  </Grid>;
};


export function PublishTaskset(props: any) {
  let { id } = useParams();
  const appState = React.useContext(CrowdaqUIContext);

  const owner = appState.username;

  const taskURL = `https://dev2.crowdaq.com/w/task/${owner}/${id}`;

  const [config, setConfig] = React.useState<CreateHITRequest>({
    AssignmentDurationInSeconds: 3600,
    AutoApprovalDelayInSeconds: 0,
    Description: `HIT Description for Taskset ${id}`,
    Keywords: 'keyword1, keyword2',
    LifetimeInSeconds: 3600 * 24,
    MaxAssignments: 0,
    QualificationRequirements: [],
    Question: '',
    RequesterAnnotation: '',
    Reward: '0.01',
    Title: `HIT title for Taskset ${id}`
  });

  const [awsProfile, setAwsProfile] = React.useState<AWSCredProfile>({
    name: '',
    region: undefined,
    aws_access_key_id: '',
    aws_secret_access_key: ''
  });

  const [count, setCount] = React.useState(3);
  const [remainBalance, setRemainBalance] = React.useState<GetAccountBalanceResponse>({
    AvailableBalance: undefined,
    OnHoldBalance: undefined
  });
  const [sandbox, setSandbox] = React.useState(true);

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const [name, setName] = React.useState(`${owner}-${id}-${moment().format('YYYY-MM-DD')}`);

  const [quals, setQuals] = React.useState<{ [key: string]: QualificationRequirement }>({});

  const [countType, setCountType] = React.useState<'CreateNew' | 'CreateTo'>('CreateNew');

  const [progress, setProgress] = React.useState<TaskProgress>({
    lastUpdateTime: '',
    progressCurrent: 0,
    progressText: '',
    progressTotal: 0,
    status: ''
  });

  const trackerId = `task-hit-publish-${owner}-${id}`;

  function checkForWorkerProgress() {
    const item = localStorage.getItem(trackerId);

    if (item) {
      try {
        const p = JSON.parse(item) as ProgressUpdateArg;
        setProgress(p.progress);
      } catch (e) {

      }
    }
  }

  React.useEffect(() => {
    window.addEventListener('storage', checkForWorkerProgress);

    return () => {
      window.removeEventListener('storage', checkForWorkerProgress);
    };
  }, []);

  function updateAccount(profile: AWSCredProfile, sandbox: boolean) {
    setAwsProfile(profile);
    setSandbox(sandbox);
    if (sandbox) {
      setQuals(SandboxCommonQuals);
    } else {
      setQuals(ProdCommonQuals);
    }
    setRemainBalance({
      AvailableBalance: undefined,
      OnHoldBalance: undefined
    });
  }

  function fetchBalance() {
    const mturkClient = createMTurkClient(awsProfile, sandbox);
    setLoading(true);
    mturkClient.getAccountBalance({}).promise().then(resp => {
      setRemainBalance(resp);
      setLoading(false);
    }).catch(error => {
      setError('Something is wrong');
      setLoading(false);
    });
  }


  let progressDisplay;

  if (progress.progressText !== '') {
    switch (progress.status) {
      case 'running':
        progressDisplay = <React.Fragment>
          <LinearProgressWithLabel value={progress.progressCurrent * 100 / progress.progressTotal} />
          {progress.progressText}
        </React.Fragment>;
        break;
      case 'finished':
        progressDisplay = <React.Fragment>
          {progress.progressText}
        </React.Fragment>;
    }

  }

  return <div>

    <TextField
      fullWidth
      label="Name of this HIT batch"
      helperText='This name will be used for bookkeeping purposes.'
      style={{ margin: 8 }}
      margin="normal"
      value={name}
      InputLabelProps={{
        shrink: true
      }}
      onChange={(event) => setName(event.target.value)}
    />


    <h3>1. Select Mturk Profile:</h3>

    <MturkAccountSelector onUpdate={updateAccount} />

    <Divider variant="middle" />

    <h3>2. Config HITs details:</h3>

    <MturkCreateHitConfigurator request={config} onUpdate={setConfig} candidates={quals} />

    <h3>3. Decide how many tasks to offer</h3>

    <FormControl>
      <InputLabel id="comparator-select-label">Count Mode</InputLabel>
      <Select
        labelId="comparator-select-label"
        id="comparator-select"
        value={countType}
        style={{ minWidth: '15em' }}
        onChange={e => {
          // @ts-ignore
          setCountType(e.target.value);
        }}
      >
        {[
          {
            v: 'CreateNew',
            n: 'Create new hits for each task item'
          }, {
            v: 'CreateTo',
            n: 'Create new hits until each task item has at least this amount of assignments'
          }
        ].map(({ v, n }) => {
          return <MenuItem value={v} key={v}>{n}</MenuItem>;
        })}
      </Select>
    </FormControl>

    <TextField
      fullWidth
      label="How many hits for each task item?"
      style={{ margin: 8 }}
      margin="normal"
      value={count}
      InputLabelProps={{
        shrink: true
      }}
      onChange={(event) => {
        const cnt = parseInt(event.target.value);
        if(!isNaN(cnt)){
          setCount(cnt);
        }
        else{
          setCount(1);
        }
      }}
    />

    <div>
      {/*<p>This will cost: $<b>{(parseFloat(config.Reward) * count).toFixed(2)}</b></p>*/}
      {
        remainBalance.AvailableBalance === undefined
          ? <Button onClick={fetchBalance} disabled={awsProfile.name === ''}>Check your balance</Button>
          : <span>And you have ${remainBalance.AvailableBalance} in your mturk account.</span>
      }

    </div>

    {/*<p>Before you publish the task to Mturk, make sure that the task URL is correct:</p>*/}
    {/*<p>{taskURL}</p>*/}

    <CardActions>
      <Button
        disabled={awsProfile.name === ''}
        variant="outlined"
        color={'primary'}
        onClick={() => {
          startPublishTask(
            name,
            appState,
            awsProfile,
            sandbox,
            config,
            id,
            countType,
            count,
            trackerId
          )
          ;
        }}
      >Publish</Button>
    </CardActions>

    {progressDisplay}

  </div>;
}


export function TasksetAssignments(props: any) {
  return <div>Taskset Assignments</div>;
}

export function TasksetDownload(props: any) {
  return <div>Download Taskset</div>;
}
