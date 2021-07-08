import React from 'react';
import { CrowdaqUIContext, getAuthHeader } from '../../crowdaq/context';
import { CrowdaqListing, LinearProgressWithLabel } from './Utils';
import { useSelector } from 'react-redux';
import { Box, Button, Card, CardActions, Container, Divider, Grid, TextField } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import { useParams } from 'react-router';
import { Link } from 'react-router-dom';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Paper from '@material-ui/core/Paper';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import { PublishTaskset, TasksetAssignments, TasksetDownload } from './Task';
import { MturkCreateHitConfigurator } from '../mturk/Qualifications';
import { CreateHITRequest, GetAccountBalanceResponse, QualificationRequirement } from 'aws-sdk/clients/mturk';
import {
  AWSCredProfile,
  createMTurkClient,
  getObjectFolder, getTotalAssignmentPage,
  makeRequest, openFolder, ProdCommonQuals, readAssignmentPage, readStatus, SandboxCommonQuals,
  saveToFile,
  SendNotification, Status
} from '../../utils';
import { MturkAccountSelector } from '../mturk/MturkPage';
import moment from 'moment';
import { CircularProgress } from '@material-ui/core';
import { ProgressUpdateArg, startPublishExam, startSyncExam, startSyncTask, TaskProgress } from '../../workerRequests';
import { Pagination } from '@material-ui/lab';
import _ from 'lodash'


const useStyles = makeStyles((theme) => ({

  card: {
    padding: theme.spacing(2),
    marginTop: theme.spacing(2)
  },

  column: {
    marginTop: theme.spacing(2)
  }
}));

export const CrowdaqExams: React.FunctionComponent<{}> = (props) => {
  const appState = React.useContext(CrowdaqUIContext);
  const owner = appState.username;

  return <div>
    <h1>Exams</h1>
    <CrowdaqListing fn={'exam.list'} filter={{ owner }} itemDisplayComponent={ExamDisplays} />
  </div>;
};


export interface ExamDataItem {
  _id: string,
  owner: string,
  create_at: string,
  update_at: string,
  exam_id: string,
  instruction_id: string,
  tutorial_id: string,
  num_of_questions: number,
  max_attempts: number,
  passing_grade: number,
  time_limit_in_seconds: number,
  qualification_id: string
}


export const ExamDisplays: React.FunctionComponent<{ items: ExamDataItem[] }> = (props) => {
  return <TableContainer component={Paper}>
    <Table aria-label="simple table">
      <TableHead>
        <TableRow>
          <TableCell>Exam Name</TableCell>
          <TableCell align="left">Actions</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {props.items.map((item, idx) => {
          return <ExamRow key={item._id} {...item} />;
        })}
      </TableBody>
    </Table>
  </TableContainer>;

};


export const ExamRow: React.FunctionComponent<ExamDataItem> = (props) => {
  const classes = useStyles();

  return <TableRow className={classes.card}>
    <TableCell>{props.owner}/{props.exam_id}</TableCell>
    <TableCell align="left"> <Button
      component={Link}
      to={`/exam/${props.exam_id}`}
      color="inherit"
    >Open</Button></TableCell>
  </TableRow>;
};


export const CrowdaqExamPage: React.FunctionComponent<{}> = (props) => {
  let { id } = useParams();
  const appState = React.useContext(CrowdaqUIContext);
  const owner = appState.username;
  const [value, setValue] = React.useState(0);
  const [status, setStatus] = React.useState<Status>({ lastUpdate: '', message: '', status: 'empty' });


  async function refreshStatus() {
    const dest = await getObjectFolder(appState, 'exam', owner, id);
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

  const trackerId = `exam-syncing-${owner}-${id}`;

  function checkForWorkerProgress() {
    const item = localStorage.getItem(trackerId);

    if (item) {
      try {
        const p = JSON.parse(item) as ProgressUpdateArg;
        if (p.progress.status === 'finished') {
          refreshStatus();
        }
        setProgress(p.progress);
      } catch (e) {

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

  const classes = useStyles();


  const handleChange = (event: any, newValue: number) => {
    setValue(newValue);
  };

  let currentTab;

  switch (value) {
    case 0:
      currentTab = <PublishExamHit />;
      break;
    case 1:
      currentTab = <ExamAssignmentPage />;
      break;
    // case 2:
    //   currentTab = <ExamMturkQualPage />;
    //   break;
    // case 3:
    //   currentTab = <ExamDownloadTab />;
    //   break;
  }

  async function synNow() {
    // const dest = await getObjectFolder(appState, 'exam', owner, id);
    // const newStatus = await syncExam(appState, owner, id, dest);
    // setStatus(newStatus);
    const { endpoint, username, password, token } = appState;
    await startSyncExam({
      currentAppState: appState, exam_id: id, trackerId
    });
  }

  async function handleOpenFolder() {
    const dest = await getObjectFolder(appState, 'exam', owner, id);
    await openFolder(dest);
  }

  let statusDisplay;

  switch (status.status) {
    case 'empty':
      statusDisplay = <div>Exam has not been synced</div>;
      break;
    case 'error':
      statusDisplay = <div>Error: ${status.message}</div>;
      break;
    case 'finished':
      statusDisplay = <div>Exam syncing finished.</div>;
      break;
    case 'syncing':
      statusDisplay = <div>Exam syncing in progress.</div>;
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
        Exam: {owner}/{id}
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
        aria-label="disabled tabs example"
      >
        <Tab label="Publish To Mturk" />
        <Tab label="Worker and Grades" />
        {/*<Tab label="MTurk Qualifications" />*/}
        {/*<Tab label="Download" />*/}
      </Tabs>
      <Card className={classes.card}>
        {currentTab}
      </Card>
    </Grid>


  </Grid>;
};

export function PublishExamHit(props: any) {
  let { id } = useParams();
  const appState = React.useContext(CrowdaqUIContext);

  const owner = appState.username;

  const examURL = `https://dev2.crowdaq.com/w/exam/${owner}/${id}`;

  const [config, setConfig] = React.useState<CreateHITRequest>({
    AssignmentDurationInSeconds: 3600,
    AutoApprovalDelayInSeconds: 0,
    Description: `HIT Description for Exam ${id}`,
    Keywords: 'keyword1, keyword2',
    LifetimeInSeconds: 3600 * 24,
    MaxAssignments: 0,
    QualificationRequirements: [],
    Question: '',
    RequesterAnnotation: '',
    Reward: '0.01',
    Title: `HIT title for Exam ${id}`
  });

  const [awsProfile, setAwsProfile] = React.useState<AWSCredProfile>({
    name: '',
    region: undefined,
    aws_access_key_id: '',
    aws_secret_access_key: ''
  });

  const [count, setCount] = React.useState(20);
  const [remainBalance, setRemainBalance] = React.useState<GetAccountBalanceResponse>({
    AvailableBalance: undefined,
    OnHoldBalance: undefined
  });
  const [sandbox, setSandbox] = React.useState(true);

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const [name, setName] = React.useState(`${owner}-${id}-${moment().format('YYYY-MM-DD')}`);

  const [quals, setQuals] = React.useState<{ [key: string]: QualificationRequirement }>({});


  const [progress, setProgress] = React.useState<TaskProgress>({
    lastUpdateTime: '',
    progressCurrent: 0,
    progressText: '',
    progressTotal: 0,
    status: ''
  });

  const trackerId = `exam-hit-publish-${owner}-${id}`;

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
    <Box>
      <div>
        {
          remainBalance.AvailableBalance === undefined
            ? <Button onClick={fetchBalance} disabled={awsProfile.name === ''}>Check your balance</Button>
            : <span>You have ${remainBalance.AvailableBalance} in your mturk account.</span>
        }
      </div>
    </Box>
    <Divider variant="middle" />
      

    <h3>2. Config HITs details:</h3>

    <MturkCreateHitConfigurator request={config} onUpdate={setConfig} candidates={quals} />

    <h3>3. Decide how many exams to offer</h3>

    <TextField
      fullWidth
      label="How many exams to publish?"
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
        }
      } 
    />

    <div>
      <p>This will cost: $<b>{(parseFloat(config.Reward) * count).toFixed(2)}</b> (overhead to MTurk not included)</p>
      

    </div>

    <h4>Final Check</h4>

    <p>Before you publish the exam to Mturk, make sure that the exam URL is correct:</p>
    <p>{examURL}</p>

    <CardActions>
      <Button
        disabled={awsProfile.name === ''}
        variant="outlined"
        color={'primary'}
        onClick={() => {
          startPublishExam(
            name,
            appState,
            awsProfile,
            sandbox,
            config,
            id,
            count,
            trackerId
          );
        }}
      >Publish</Button>
    </CardActions>

    {progressDisplay}

  </div>;
}


export function ExamGrades(props: any) {

  const appState = React.useContext(CrowdaqUIContext);
  const authHeader = getAuthHeader(appState);
  const owner = appState.username;
  const endpoint = appState.endpoint;


  return <div></div>;


}


export function ExamDownloadTab(props: any) {

  const appState = React.useContext(CrowdaqUIContext);
  const authHeader = getAuthHeader(appState);
  const owner = appState.username;
  const endpoint = appState.endpoint;

  const [loading, setLoading] = React.useState(false);
  let { id: exam_id } = useParams();

  return <div></div>;
}


export function ExamAssignmentPage(props: any) {
  let { id } = useParams();
  const appState = React.useContext(CrowdaqUIContext);

  const [loading, setLoading] = React.useState(true);

  const owner = appState.username;
  const [awsProfile, setAwsProfile] = React.useState<AWSCredProfile>({
    name: '',
    region: undefined,
    aws_access_key_id: '',
    aws_secret_access_key: ''
  });

  const [sandbox, setSandbox] = React.useState(true);
  const [qualId, setQualId] = React.useState('');
  const pageSize = 15;


  const [page, setPage] = React.useState(1);
  const [totalPage, setTotalPage] = React.useState(1);

  const [items, setItems] = React.useState<any[]>([]);
  const [currentDisplayIndices, setCurrentIndices] = React.useState<number[]>([]);

  const [workerIdFilter, setWorkerIdFilter] = React.useState('');

  function updateAccount(profile: AWSCredProfile, sandbox: boolean) {
    setAwsProfile(profile);
    setSandbox(sandbox);
  }

  async function loadAssignments(page: number) {
    setLoading(true)
    const dest = await getObjectFolder(appState, 'exam', owner, id);
    const totalPage = getTotalAssignmentPage(dest);
    // console.log({totalPage})
    // setTotalPage(totalPage);
    const items = _.flatMap(_.range(1, totalPage+1), p => readAssignmentPage(dest, p, totalPage));
    // const items = readAssignmentPage(dest, page, totalPage);
    // console.log({items})
    setItems(items);
    setCurrentIndices(_.range(items.length));
    setLoading(false);
  }

  React.useEffect(() => {
    loadAssignments(page);
  }, []);

  React.useEffect(() => {

  }, [page]);

  function handleApplyQualToAll(){

  }

  return <div>
    <h3>Set up Mturk profile and Mturk Qual ID:</h3>
    <MturkAccountSelector onUpdate={updateAccount} />
    <TextField
      label="Qual Id"
      style={{ margin: 8 }}
      margin="normal"
      value={qualId}
      onChange={(event) => setQualId(event.target.value)}
    />

    <Button variant='outlined' style={{ marginTop: 16 }} onClick={handleApplyQualToAll}>Apply Qual To All</Button>


    <h3>Exam Assignments:</h3>

    <TextField
      label="Search Worker"
      style={{ margin: 8 }}
      margin="normal"
      value={workerIdFilter}
      onChange={(event) => {
        const filter = event.target.value;
        setWorkerIdFilter(filter);
        const newDis =_.chain(items)
          .map((item,idx) => ({item,idx}))
          .filter(x => (x.item.worker_id as string).includes(filter) || (x.item.worker_platform as string).includes(filter))
          .map(x => x.idx)
          .value()
        console.log(newDis);
        setCurrentIndices(newDis);
        setPage(1);
      }}
    />

    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Worker</TableCell>
            <TableCell>Grade</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {currentDisplayIndices.map((didx, idx) => {
            const item = items[didx];
            if (idx >= ((page-1) * pageSize) && idx < ((page) * pageSize)){
              return <TableRow key={item._id}>
                <TableCell component="th" scope="row">
                  # {idx - (page-1) * pageSize + 1 }: {item.worker_platform} - {item.worker_id}
                </TableCell>
                <TableCell >{item.grade}</TableCell>
                <TableCell >
                  {(item.worker_platform === 'mturk' || item.worker_platform === 'mturk-sandbox') && <Button disabled>Send Bonus</Button>}
                  {/*<Button>Assign Qual</Button>*/}
                  {/*<Button>Remove Qual</Button>*/}
                </TableCell>
              </TableRow>
            }else{
              return undefined
            }
          })}
        </TableBody>
      </Table>
    </TableContainer>

    <Pagination count={Math.ceil(currentDisplayIndices.length / pageSize)} page={page} onChange={(event: React.ChangeEvent<unknown>, value: number) => {
      setPage(value);
    }}/>
  </div>;
}


