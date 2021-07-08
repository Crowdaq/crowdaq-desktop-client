import { CrowdaqAppState } from './crowdaq/context';
import { AWSCredProfile } from './utils';
import { MTurk } from 'aws-sdk';

const { ipcRenderer } = require('electron');

export const WorkerRequestChannel = 'worker-request';
export const WorkerProgressUpdateChannel = 'worker-request-progress';

export interface TaskProgress {
  lastUpdateTime: string,
  status: 'running' | 'finished' | 'waiting' | 'error' | 'aborted' | ''
  progressText: string
  progressCurrent: number
  progressTotal: number
}

export interface Task {
  id: string
  request: WorkerRequests
  status: 'running' | 'finished' | 'waiting' | 'error' | 'aborted'
  progressText: string
  progressCurrent: number
  progressTotal: number
}

export interface WorkerRequests {
  type:
    'PublishExamRequest' | 'PublishTaskRequest' |
    'SyncExamRequest' | 'SyncTaskRequest' |
    'ExportExamRequest' | 'ExportTaskRequest' | 'ApplyQualRequest'
}


export interface ApplyQualRequest extends WorkerRequests {
  type: 'ApplyQualRequest'
  trackerId: string
  arg: {
    name: string,
    currentAppState: CrowdaqAppState,
    awsProfile: AWSCredProfile,
    sandbox: boolean,
    exam_id: string,
  }
}


export interface PublishExamRequest extends WorkerRequests {
  type: 'PublishExamRequest'
  trackerId: string
  arg: {
    name: string,
    currentAppState: CrowdaqAppState,
    awsProfile: AWSCredProfile,
    sandbox: boolean,
    config: MTurk.CreateHITRequest,
    exam_id: string,
    count: number
  }
}

export interface PublishTaskRequest extends WorkerRequests {
  type: 'PublishTaskRequest'
  trackerId: string
  arg: {
    name: string,
    currentAppState: CrowdaqAppState,
    awsProfile: AWSCredProfile,
    sandbox: boolean,
    config: MTurk.CreateHITRequest,
    count: number,
    countType: 'CreateNew' | 'CreateTo'
    annotation_taskset_id: string,
  }
}

export interface SyncExamRequest extends WorkerRequests {
  type: 'SyncExamRequest'
  trackerId: string
  arg: {
    currentAppState: CrowdaqAppState,
    exam_id: string,
  }
}

export interface SyncTaskRequest extends WorkerRequests {
  type: 'SyncTaskRequest'
  trackerId: string
  arg: {
    currentAppState: CrowdaqAppState,
    taskset_id: string
  }
}

export interface ExportTaskRequest extends WorkerRequests {

}


export interface ExportExamRequest extends WorkerRequests {

}


export function startPublishExam(
  name: string,
  currentAppState: CrowdaqAppState,
  awsProfile: AWSCredProfile,
  sandbox: boolean,
  config: MTurk.CreateHITRequest,
  exam_id: string,
  count: number,
  trackerId: string
) {
  const req: PublishExamRequest = {
    trackerId,
    arg: {
      name,
      currentAppState,
      awsProfile,
      sandbox,
      config,
      exam_id,
      count
    },
    type: 'PublishExamRequest'
  };
  ipcRenderer.send(WorkerRequestChannel, req);
}

export function startPublishTask(name: string,
                                 currentAppState: CrowdaqAppState,
                                 awsProfile: AWSCredProfile,
                                 sandbox: boolean,
                                 config: MTurk.CreateHITRequest,
                                 annotation_taskset_id: string,
                                 countType: 'CreateNew' | 'CreateTo',
                                 count: number,
                                 trackerId: string
) {
  const req: PublishTaskRequest = {
    trackerId,
    arg: {
      name,
      currentAppState,
      awsProfile,
      sandbox,
      config,
      annotation_taskset_id,
      count,
      countType
    },
    type: 'PublishTaskRequest'
  };

  ipcRenderer.send(WorkerRequestChannel, req);
}

export function startSyncExam(
  arg: {
    currentAppState: CrowdaqAppState, exam_id: string, trackerId: string
  }
) {
  const req: SyncExamRequest = {
    arg: arg,
    trackerId: arg.trackerId,
    type: 'SyncExamRequest'
  };
  ipcRenderer.send(WorkerRequestChannel, req);
}

export function startSyncTask(arg: {
  currentAppState: CrowdaqAppState, taskset_id: string, trackerId: string
}) {
  const { currentAppState, taskset_id, trackerId } = arg;
  const req: SyncTaskRequest = {
    arg: { currentAppState, taskset_id },
    type: 'SyncTaskRequest',
    trackerId
  };
  ipcRenderer.send(WorkerRequestChannel, req);
}

export interface ProgressUpdateArg {
  trackerId: string,
  progress: TaskProgress
}

export function updateProgress(
  progressUpdate: ProgressUpdateArg
) {
  window.localStorage.setItem(progressUpdate.trackerId, JSON.stringify(progressUpdate));

  // ipcRenderer.send(WorkerProgressUpdateChannel, progressUpdate);
}
