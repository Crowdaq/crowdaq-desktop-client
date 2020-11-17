import os from 'os';
import fs from 'fs';
import path from 'path';
import axios, { AxiosResponse } from 'axios';
import AWS, { MTurk } from 'aws-sdk';
import ini from 'ini';
import _ from 'lodash';
import mkdirp from 'mkdirp';
import { CrowdaqAppState, getAuthHeader } from './crowdaq/context';
import SanitizeFileName from 'sanitize-filename';
import { shell } from 'electron';
import moment from 'moment';
import { QualificationRequirement } from 'aws-sdk/clients/mturk';


export interface AWSCredProfile {
  name: string,
  region?: string,
  aws_access_key_id: string,
  aws_secret_access_key: string,
}

export function createMTurkClient(credProfile: AWSCredProfile, sandbox: boolean): MTurk {
  const endpoint = sandbox
    ? 'https://mturk-requester-sandbox.us-east-1.amazonaws.com'
    : 'https://mturk-requester.us-east-1.amazonaws.com';

  const ret = new MTurk({
    accessKeyId: credProfile.aws_access_key_id,
    secretAccessKey: credProfile.aws_secret_access_key,
    region: 'us-east-1',
    endpoint
  });

  return ret;
}


function makeExternalQuestion(externalUrl: string): string {
  const externalQuestion = `
<?xml version="1.0" encoding="UTF-8"?>
<ExternalQuestion xmlns="http://mechanicalturk.amazonaws.com/AWSMechanicalTurkDataSchemas/2006-07-14/ExternalQuestion.xsd">
  <ExternalURL>${externalUrl}</ExternalURL>
  <FrameHeight>1600</FrameHeight>
</ExternalQuestion>
                `.trim();
  return externalQuestion;
}

function publishExam(examUrl: string, options: any, count: number, updateProgress: (progress: string) => void) {

}

function publishTasks(examUrl: string, options: any, countPerTask: number, updateProgress: (progress: string) => void) {

}

function resolveHome(filepath: string) {
  if (filepath[0] === '~') {
    // @ts-ignore
    return path.join(process.env.HOME, filepath.slice(1));
  }
  return filepath;
}

export function saveToFile(dest: string, value: string) {
  const baseDir = getCrowdaqConfigFolder();
  path.basename(dest);
  const to = path.join(baseDir, dest);
  const made = mkdirp.sync(path.dirname(to));
  fs.writeFileSync(to, value);
}

export function loadAWSProfiles(): AWSCredProfile[] {
  let profileFile = '';
  const osUser = os.userInfo().username;
  switch (os.platform()) {
    case 'win32':
      profileFile = `C:\\Users\\${osUser}\\.aws\\credentials`;
      break;
    default:
      profileFile = resolveHome('~/.aws/credentials');
  }

  // const awsCredFileContent = fs.readFileSync(profileFile).toString();
  const awsConfig = ini.parse(fs.readFileSync(profileFile, 'utf-8'));
  return _.map(awsConfig, (value, name) => {
    return { ...value, name };
  });
  // // awsCredFileContent
  // const profileRegex = /\[(.*)\]/;
  // const lines: string[] = awsCredFileContent.split('\n');
  // return _.chain(lines)
  //   .filter(line => line.search(profileRegex) >= 0)
  //   .map()
  // // let match;
  // // while (match = profileRegex.exec(awsCredFileContent)) {
  // //   ret.push(match[1]);
  // // }
  // return awsCredFileContent.split('\n');
}

export function getCrowdaqConfigFolder() {
  let profileFile = '';
  const osUser = os.userInfo().username;
  switch (os.platform()) {
    case 'win32':
      profileFile = `C:\\Users\\${osUser}\\.crowdaq\\`;
      break;
    default:
      profileFile = resolveHome('~/.crowdaq/');
  }
  return profileFile;
}


export function writeCrowdaqConfigFolder() {

}

export function get() {

}

export function SendNotification(text: string) {
  if (!('Notification' in window)) {
    alert('This browser does not support desktop notification');
  }

  // Let's check whether notification permissions have already been granted
  else if (Notification.permission === 'granted') {
    // If it's okay let's create a notification
    var notification = new Notification(text);
  }

  // Otherwise, we need to ask the user for permission
  else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then(function(permission) {
      // If the user accepts, let's create a notification
      if (permission === 'granted') {
        const notification = new Notification(text);
      }
    });
  }

}

export async function makeRequest(endpoint: string, fn: string, args: object, headers?: any): Promise<AxiosResponse> {
  if (headers !== undefined) {
    headers['content-type'] = 'application/json';
  } else {
    headers = {
      'content-type': 'application/json'
    };
  }
  try {
    return await axios.post(endpoint, { fn, args }, { headers });
  } catch (error) {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      if (error.response.status === 401) {
        SendNotification('Access denied');
      } else {
        if (error.response.data.message) {
          SendNotification(error.response.data.message);
        } else {
          SendNotification(JSON.stringify(error.response.data));
        }
      }
    } else if (error.request) {
      // The request was made but no response was received
      // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
      // http.ClientRequest in node.js
      SendNotification('Cannot not connect to server');

    } else {
      // Something happened in setting up the request that triggered an Error
      SendNotification(JSON.stringify(error.message));
    }

    throw error;

  }
}

/**
 *
 * Each target will be saved in one folder, which contains the following files:
 *   * status.json
 *   * exam-questions.json
 *   * exam-assignments-*.json
 *   * exam-configs.json
 *
 *   * task-objects-*.json
 *   * task-assignments-*.json
 *
 *   mturk/exam-batch-*.json
 *   mturk/task-batch-*.json
 *
 * @param currentAppState
 * @param objectType
 * @param objectOwner
 * @param objectId
 */
export async function getObjectFolder(
  currentAppState: CrowdaqAppState,
  objectType: 'instruction' | 'tutorial' | 'exam' | 'taskset',
  objectOwner: string,
  objectId: string,
  createIfNotExists: boolean = true
) {
  const { endpoint } = currentAppState;
  const endpointPart = SanitizeFileName(endpoint.replace('/', '_'));
  const p = path.join(getCrowdaqConfigFolder(), endpointPart, objectOwner, objectType, objectId);
  if (createIfNotExists && !fs.existsSync(p)) {
    await mkdirp(p);
  }
  return p;
}

export interface Status {
  status: 'syncing' | 'error' | 'finished' | 'empty',
  lastUpdate: string,
  message?: string
}

export function writeStatus(base: string, status: Status) {
  fs.writeFileSync(path.join(base, 'status.json'), JSON.stringify(status));
}

export function readStatus(base: string): Status {
  const statusFile = path.join(base, 'status.json');
  if (fs.existsSync(statusFile)) {
    try {
      const statusFileContent = fs.readFileSync(statusFile, 'utf-8');
      return JSON.parse(statusFileContent);
    } catch (e) {
      return {
        status: 'error',
        lastUpdate: moment().format(),
        message: 'Cannot load status file.'
      };
    }
  } else {
    return {
      status: 'empty',
      lastUpdate: moment().format()
    };
  }


}


export async function syncInstruction(currentAppState: CrowdaqAppState, owner: string, instruction_id: string, baseFolder: string) {
  const out = await makeRequest(currentAppState.endpoint, 'instruction.get', {
    owner, instruction_id
  }, getAuthHeader(currentAppState));
  fs.writeFileSync(
    path.join(baseFolder, 'instruction.json'),
    JSON.stringify(out.data));

  fs.writeFileSync(
    path.join(baseFolder, 'instruction-sharable.json'),
    JSON.stringify(out.data.definition));


  await openFolder(baseFolder);
}

export async function syncTutorial(currentAppState: CrowdaqAppState, owner: string, tutorial_id: string, baseFolder: string) {
  const out = await makeRequest(currentAppState.endpoint, 'tutorial.get', {
    owner, tutorial_id
  }, getAuthHeader(currentAppState));
  fs.writeFileSync(
    path.join(baseFolder, 'tutorial.json'),
    JSON.stringify(out.data));

  fs.writeFileSync(
    path.join(baseFolder, 'tutorial-sharable.json'),
    JSON.stringify(out.data.definition));

  await openFolder(baseFolder);
}


// export async function syncExam(currentAppState: CrowdaqAppState, owner: string, exam_id: string, baseFolder: string): Promise<Status> {
//   const out = await makeRequest(currentAppState.endpoint, 'exam.get', {
//     owner, exam_id
//   }, getAuthHeader(currentAppState));
//   fs.writeFileSync(
//     path.join(baseFolder, 'exam.json'),
//     JSON.stringify(out.data));
//   await openFolder(baseFolder);
//   return {
//     status: 'finished',
//     lastUpdate: moment().format()
//   };
// }
//
// export async function syncTask(currentAppState: CrowdaqAppState, owner: string, taskset_id: string, baseFolder: string): Promise<Status> {
//   const out = await makeRequest(currentAppState.endpoint, 'taskset.get', {}, getAuthHeader(currentAppState));
//   fs.writeFileSync(
//     path.join(baseFolder, 'exam.json'),
//     JSON.stringify(out.data));
//   await openFolder(baseFolder);
//   return {
//     status: 'finished',
//     lastUpdate: moment().format()
//   };
// }


export async function openFolder(folder: string) {
  await shell.openItem(folder);
}


export type ProdOrSandbox = 'prod' | 'sandbox';

export const SandboxCommonQuals: { [key: string]: QualificationRequirement } = {
  'Require Master': {
    ActionsGuarded: 'Accept',
    Comparator: 'Exists',
    QualificationTypeId: '2F1QJWKUDD8XADTFD2Q0G6UTO95ALH'
  },
  'Require US': {
    ActionsGuarded: 'Accept',
    Comparator: 'EqualTo',
    LocaleValues: [{
      'Country': 'US'
    }],
    QualificationTypeId: '00000000000000000071'
  }
};

export const ProdCommonQuals: { [key: string]: QualificationRequirement } = {
  'Require Master': {
    ActionsGuarded: 'Accept',
    Comparator: 'Exists',
    QualificationTypeId: '2ARFPLSP75KLA8M8DH1HTEQVJT3SY6'
  },
  'Require US': {
    ActionsGuarded: 'Accept',
    Comparator: 'EqualTo',
    LocaleValues: [{
      'Country': 'US'
    }],
    QualificationTypeId: '00000000000000000071'
  }
};


export function getTotalAssignmentPage(dest: string): number {
  const assignmentFolder = path.join(dest, 'assignments')
  const files = fs.readdirSync(assignmentFolder);
  for (let f of files) {
    console.log(f)
    if (f.endsWith('.json') && f.startsWith('assignments-1-of-')) {
      let totalPageStr = f.substring('assignments-1-of-'.length);
      console.log(totalPageStr)

      const totalPage = parseInt(totalPageStr.substring(0, totalPageStr.indexOf('.json')));
      console.log(totalPageStr.substring(totalPageStr.indexOf('.json')))
      return totalPage;
    }
  }
  return 0;
}

export function readAssignmentPage(dest: string, page: number, totalPage: number): any[] {
  const assignmentFolder = path.join(dest, 'assignments')

  if (totalPage === 0) {
    return [];
  }
  const fp = path.join(assignmentFolder, `assignments-${page}-of-${totalPage}.json`);
  if (!fs.existsSync(fp)) {
    return [];
  }
  const content = fs.readFileSync(fp, 'utf-8');
  return JSON.parse(content);
  // return undefined;
}
