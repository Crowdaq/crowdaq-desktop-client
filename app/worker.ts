import {
  ExportExamRequest,
  ExportTaskRequest, PublishExamRequest, PublishTaskRequest,
  SyncExamRequest,
  SyncTaskRequest, updateProgress,
  WorkerRequests
} from './workerRequests';
import { getAuthHeader, getAuthHeaderFromToken } from './crowdaq/context';
import fs from 'fs';
import os from 'os';
import _ from 'lodash';

import moment from 'moment';
import { AWSCredProfile, getObjectFolder, makeRequest, openFolder, Status } from './utils';
import { userInfo } from 'os';
import mkdirp from 'mkdirp';
import { MTurk } from 'aws-sdk';

const { ipcRenderer } = require('electron');
const Datastore = require('nedb');
const path = require('path');
import AWS from 'aws-sdk';
import { CreateHITResponse } from 'aws-sdk/clients/mturk';
import { AWSError } from 'aws-sdk/lib/error';
import { PromiseResult } from 'aws-sdk/lib/request';



function tryNotify(title: string) {
  try{
    new Notification(title);
  }catch (e) {

  }

}

class Counter {

  counter: { [key: string]: number };

  constructor() {
    this.counter = {};
  }

  get(key: string) {
    const cur = this.counter[key];
    if (cur) {
      return cur;
    } else {
      return 0;
    }
  }

  incr(key: string, count: number = 1) {
    const cur = this.counter[key];
    if (cur) {
      this.counter[key] = cur + count;
    } else {
      this.counter[key] = count;
    }
  }

  count(values: string[]) {
    values.forEach(v => this.incr(v));
  }

}


function getMturkClient(sandbox: boolean, awsProfile: AWSCredProfile): AWS.MTurk {
  let endpoint = '';

  if (sandbox) {
    endpoint = 'https://mturk-requester-sandbox.us-east-1.amazonaws.com';
  } else {
    endpoint = 'https://mturk-requester.us-east-1.amazonaws.com';
  }

  const mturk = new AWS.MTurk({
    accessKeyId: awsProfile.aws_access_key_id,
    secretAccessKey: awsProfile.aws_secret_access_key,
    region: 'us-east-1',
    endpoint: endpoint
  });
  return mturk;
}

// const requestQueue: WorkerRequests[] = [];
const db = new Datastore();

async function publishExternalQuestion(
  awsProfile: AWSCredProfile,
  sandbox: boolean,
  externalUrl: string,
  options: MTurk.CreateHITRequest,
  count: number,
  onUpdate: (out: PromiseResult<MTurk.Types.CreateHITResponse, AWSError>, cum: number, total: number) => void
) {
  const externalQuestion = `
<?xml version="1.0" encoding="UTF-8"?>
<ExternalQuestion xmlns="http://mechanicalturk.amazonaws.com/AWSMechanicalTurkDataSchemas/2006-07-14/ExternalQuestion.xsd">
  <ExternalURL>${externalUrl}</ExternalURL>
  <FrameHeight>1600</FrameHeight>
</ExternalQuestion>
                `.trim();
  const mturk = getMturkClient(sandbox, awsProfile);
  console.log('publishExternalQuestion');
  const batchCounts = [];
  while (count > 0) {
    if (count < 10) {
      batchCounts.push(count);
      break;
    } else {
      batchCounts.push(10);
      count -= 10;
    }
  }
  console.log(batchCounts);
  let cum = 0;

  for (let c of batchCounts) {
    cum += c;

    const param = {
      ...options,
      Question: externalQuestion,
      MaxAssignments: c
    };
    console.log(param);
    try{
      const out: PromiseResult<MTurk.Types.CreateHITResponse, AWSError> = await mturk.createHIT(param).promise();
      if (onUpdate) onUpdate(out, cum, count);
    }
    catch (err){
      console.log("Error in launching HITs")
    }
  }

}

async function PublishExam(req: PublishExamRequest) {
  const { name, awsProfile, currentAppState, exam_id, sandbox, config, count } = req.arg;

  tryNotify(`Publishing ${exam_id}`)

  const examUrl = `${currentAppState.baseUrl}/w/exam/${currentAppState.username}/${exam_id}`;
  const dest = await getObjectFolder(currentAppState, 'exam', currentAppState.username, exam_id);

  await mkdirp(path.join(dest, 'hits'));

  const outs: MTurk.HIT[] = [];

  function onUpdate(out: PromiseResult<MTurk.Types.CreateHITResponse, AWSError>, cum: number, _count: number) {

    updateProgress({
      progress: {
        lastUpdateTime: moment().format(),
        progressCurrent: cum,
        progressText: `Publishing Hits for externalUrls (${cum} of ${count})`,
        progressTotal: count,
        status: 'running'
      }, trackerId: req.trackerId
    });

    if (out.HIT) {
      outs.push(out.HIT);
    }

  }

  await publishExternalQuestion(awsProfile, sandbox, examUrl, config, count, onUpdate);

  console.log(outs);

  fs.writeFileSync(path.join(dest, 'hits', `hits-${name}.json`), JSON.stringify(outs));

  updateProgress({
    progress: {
      lastUpdateTime: moment().format(),
      progressCurrent: 1,
      progressText: `Hits published.`,
      progressTotal: 1,
      status: 'finished'
    }, trackerId: req.trackerId
  });

  tryNotify(`Published ${exam_id}`)
}


async function PublishTask(req: PublishTaskRequest) {

  const { name, awsProfile, currentAppState, annotation_taskset_id, sandbox, config, count, countType } = req.arg;
  const taskUrlBase = `${currentAppState.baseUrl}/w/task/${currentAppState.username}/${annotation_taskset_id}`;
  const dest = await getObjectFolder(currentAppState, 'taskset', currentAppState.username, annotation_taskset_id);
  await mkdirp(path.join(dest, 'hits'));
  tryNotify(`Published ${annotation_taskset_id}`)

  function countExistingAssignments(): Counter {
    const assignmentDir = path.join(dest, 'assignments');
    const counter = new Counter();

    const files = fs.readdirSync(assignmentDir);
    for (let f of files) {
      const p = path.resolve(assignmentDir, f);
      const fstat = fs.lstatSync(p);
      if ((!fstat.isDirectory()) && f.endsWith('.json')) {
        const fileContent = fs.readFileSync(p, 'utf-8');
        const tasks: any[] = JSON.parse(fileContent);
        tasks.forEach(t => {
          counter.incr(t.annotation_task_id);
        });
      }
    }
    return counter;
  }

  function listTasks(): string[] {
    const ret: string[] = [];
    const taskDir = path.join(dest, 'tasks');
    const files = fs.readdirSync(taskDir);
    for (let f of files) {
      const p = path.resolve(taskDir, f);
      const fstat = fs.lstatSync(p);
      if ((!fstat.isDirectory()) && f.endsWith('.json')) {
        const fileContent = fs.readFileSync(p, 'utf-8');
        const tasks: any[] = JSON.parse(fileContent);
        tasks.forEach(t => {
          ret.push(t.annotation_task_id);
        });
      }
    }
    return ret;
  }

  const plans: { taskId: string, count: number }[] = [];
  const taskIds = listTasks();

  let total = 0;

  if (countType === 'CreateNew') {
    taskIds.forEach(taskId => {
      total += count;
      plans.push({
        taskId, count
      });
    });
  } else {
    const existingCounter = countExistingAssignments();
    taskIds.forEach(taskId => {
      const existing = existingCounter.get(taskId);
      const c = Math.max(count - existing, 0);
      total += c;
      plans.push({
        taskId, count: c
      });
    });
  }

  console.log(plans);
  console.log(total);

  const outs: MTurk.HIT[] = [];
  let finished = 0;

  function onUpdate(out: PromiseResult<MTurk.Types.CreateHITResponse, AWSError>, cum: number, _count: number) {
    if (out.HIT) {
      outs.push(out.HIT);
    }
  }

  for (let plan of plans) {
    const taskUrl = `${taskUrlBase}/${plan.taskId}`;
    await publishExternalQuestion(awsProfile, sandbox, taskUrl, config, plan.count, onUpdate);
    finished += plan.count;
    updateProgress({
      progress: {
        lastUpdateTime: moment().format(),
        progressCurrent: finished,
        progressText: `Publishing Hits (${finished} of ${total})`,
        progressTotal: total,
        status: 'running'
      }, trackerId: req.trackerId
    });
  }

  fs.writeFileSync(path.join(dest, 'hits', `hits-${name}.json`), JSON.stringify(outs));

  updateProgress({
    progress: {
      lastUpdateTime: moment().format(),
      progressCurrent: 1,
      progressText: `Hits published.`,
      progressTotal: 1,
      status: 'finished'
    }, trackerId: req.trackerId
  });

  tryNotify(`Published ${annotation_taskset_id}`)

}


async function fetchAllPage(
  endpoint: string,
  fn: string,
  listItemFilter: any,
  authHeader: any,
  onPageFinished: (pageData: any, page: number, totalPage: number) => void
) {
  const page_size = 100;

  async function fetchSinglePage(page: number) {
    const page_option = {
      page_size, page
    };

    const reqArg = { ...listItemFilter, page_option };

    return makeRequest(endpoint, fn, reqArg, authHeader);
  }

  let page = 1;
  let totalPage = 1;
  while (true) {
    if (page > totalPage) break;
    const resp = await fetchSinglePage(page);
    totalPage = Math.ceil(resp.data.estimated_item_count / page_size);
    onPageFinished(resp.data.payload, page, totalPage);
    page += 1;
  }

}


/**
 * Sync Exam data
 * @param req
 * @constructor
 */
async function SyncExam(req: SyncExamRequest) {
  const { exam_id, currentAppState } = req.arg;
  const dest = await getObjectFolder(currentAppState, 'exam', currentAppState.username, exam_id);
  const out = await makeRequest(currentAppState.endpoint, 'exam.get', {
    owner: currentAppState.username, exam_id
  }, getAuthHeader(currentAppState));

  await mkdirp(path.join(dest, 'questions'));
  await mkdirp(path.join(dest, 'assignments'));

  fs.writeFileSync(
    path.join(dest, 'examConfig.json'),
    JSON.stringify(out.data));

  function writeQuestionToFile(items: any, page: number, totalPage: number) {
    fs.writeFileSync(
      path.join(dest, 'questions', `questions-${page}-of-${totalPage}.json`),
      JSON.stringify({
        question_set: _.map(items, item => item.definition),
        meta: _.map(items, item => {
          delete item.definition
          return item;
        })
      }));
    updateProgress({
      progress: {
        lastUpdateTime: moment().format(),
        status: 'running',
        progressText: `Downloading exam questions (Finished ${page} of ${totalPage})`,
        progressCurrent: page,
        progressTotal: totalPage
      }, trackerId: req.trackerId
    });
  }

  function writeAssignmentsToFile(items: any, page: number, totalPage: number) {
    fs.writeFileSync(
      path.join(dest, 'assignments', `assignments-${page}-of-${totalPage}.json`),
      JSON.stringify(items));
    updateProgress({
      progress: {
        lastUpdateTime: moment().format(),
        status: 'running',
        progressText: `Downloading exam assignments (Finished ${page} of ${totalPage})`,
        progressCurrent: page,
        progressTotal: totalPage
      }, trackerId: req.trackerId
    });
  }

  // Sync Exam Questions
  await fetchAllPage(
    currentAppState.endpoint,
    'exam_question.list',
    {
      owner: currentAppState.username, exam_id
    },
    getAuthHeader(currentAppState),
    writeQuestionToFile
  );

  // Sync Exam Assignments
  await fetchAllPage(
    currentAppState.endpoint,
    'exam_assignment.list',
    { owner: currentAppState.username, exam_id },
    getAuthHeader(currentAppState),
    writeAssignmentsToFile
  );

  const meta: Status = {
    status: 'finished',
    lastUpdate: moment().format(),
    message: ''
  };

  fs.writeFileSync(path.join(dest, 'status.json'), JSON.stringify(meta));

  updateProgress({
    progress: {
      lastUpdateTime: moment().format(),
      status: 'finished',
      progressText: `Finished downloading all exam questions and assignments.`,
      progressCurrent: 1,
      progressTotal: 1
    }, trackerId: req.trackerId
  });

  tryNotify(`Exam ${exam_id} downloaded.`)

  return {
    status: 'finished',
    lastUpdate: moment().format()
  };
}

/**
 * Sync Task
 * @param req
 * @constructor
 */
async function SyncTask(req: SyncTaskRequest) {
  const { taskset_id, currentAppState } = req.arg;
  const dest = await getObjectFolder(currentAppState, 'taskset', currentAppState.username, taskset_id);

  await mkdirp(path.join(dest, 'tasks'));
  await mkdirp(path.join(dest, 'tasks-sharable'));

  await mkdirp(path.join(dest, 'assignments'));

  const out = await makeRequest(currentAppState.endpoint, 'annotation_taskset.get', {
    owner: currentAppState.username, annotation_taskset_id: taskset_id
  }, getAuthHeader(currentAppState));

  fs.writeFileSync(
    path.join(dest, 'tasksetConfig.json'),
    JSON.stringify(out.data));


  function writeTasksToFile(items: any, page: number, totalPage: number) {
    fs.writeFileSync(
      path.join(dest, 'tasks', `annotation_task-${page}-of-${totalPage}.json`),
      JSON.stringify(_.map(items, item => {
        // item.definition = JSON.parse(item.definition)
        return item;
      }))
    );

    fs.writeFileSync(
      path.join(dest, 'tasks-sharable', `annotation_task-${page}-of-${totalPage}.json`),
      JSON.stringify(
        _.map(items, item => {
          const def = JSON.parse(item.definition)
          def.annotation_task_id = item.annotation_task_id
          return def;
        })
      ));

    updateProgress({
      progress: {
        lastUpdateTime: moment().format(),
        status: 'running',
        progressText: `Downloading annotation tasks (Finished ${page} of ${totalPage})`,
        progressCurrent: page,
        progressTotal: totalPage
      }, trackerId: req.trackerId
    });
  }

  function writeAssignmentsToFile(items: any, page: number, totalPage: number) {
    fs.writeFileSync(
      path.join(dest, 'assignments', `annotation_task_assignments-${page}-of-${totalPage}.json`),
      JSON.stringify(items));
    updateProgress({
      progress: {
        lastUpdateTime: moment().format(),
        status: 'running',
        progressText: `Downloading annotation tasks assignments (Finished ${page} of ${totalPage})`,
        progressCurrent: page,
        progressTotal: totalPage
      }, trackerId: req.trackerId
    });
  }


  // Sync Task definitions
  await fetchAllPage(
    currentAppState.endpoint,
    'annotation_task.list',
    {
      owner: currentAppState.username, annotation_taskset_id: taskset_id
    },
    getAuthHeader(currentAppState),
    writeTasksToFile
  );

  // Sync task Assignments
  await fetchAllPage(
    currentAppState.endpoint,
    'annotation_task_assignments.list',
    { owner: currentAppState.username, annotation_taskset_id: taskset_id },
    getAuthHeader(currentAppState),
    writeAssignmentsToFile
  );

  const meta: Status = {
    status: 'finished',
    lastUpdate: moment().format(),
    message: ''
  };

  fs.writeFileSync(path.join(dest, 'status.json'), JSON.stringify(meta));

  updateProgress({
    progress: {
      lastUpdateTime: moment().format(),
      status: 'finished',
      progressText: `Finished downloading all tasks and assignments.`,
      progressCurrent: 1,
      progressTotal: 1
    }, trackerId: req.trackerId
  });

  tryNotify(`Taskset ${taskset_id} downloaded.`)

  return {
    status: 'finished',
    lastUpdate: moment().format()
  };
}

function ExportExam(req: ExportExamRequest) {

}

function ExportTask(req: ExportTaskRequest) {

}

document.addEventListener('DOMContentLoaded', () => {

  // @ts-ignore
  // document.getElementById('debug').onclick= (e => {
  //   console.log('Opening dev tools.')
  //   // @ts-ignore
  //   window.openDevTools()
  // })


  ipcRenderer.on('worker-request', (event, arg) => {
    const request = arg as WorkerRequests;
    console.log('worker-request');
    console.log(request);
    // requestQueue.push(request);
    // try {
    //   // @ts-ignore
    //
    // } catch (e) {
    //
    // }


    let res;

    switch (request.type) {
      case 'PublishExamRequest':
        PublishExam(request as PublishExamRequest);
        break;
      case 'PublishTaskRequest':
        PublishTask(request as PublishTaskRequest);
        break;
      case 'SyncExamRequest':
        SyncExam(request as SyncExamRequest);
        break;
      case 'SyncTaskRequest':
        SyncTask(request as SyncTaskRequest);
        break;
      // case 'ExportExamRequest':
      //   ExportExam(request as ExportExamRequest);
      //   break;
      // case 'ExportTaskRequest':
      //   ExportTask(request as ExportTaskRequest);
      //   break;
      default:
        throw new Error(`Request type ${request.type} not recognized`);
    }
    ipcRenderer.send('worker-response', { res, arg });
  });


});

