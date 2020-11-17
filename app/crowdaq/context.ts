import React from 'react';
import CrowdaqClient from './client';
import { Task, TaskProgress } from '../workerRequests';
import _ from 'lodash';

export const CrowdaqContext = React.createContext(new CrowdaqClient());

export interface CrowdaqAppState {
  token: string,
  username: string,
  password: string,
  endpoint: string,
  baseUrl: string,
  tasks: Task[]
}

export const CrowdaqUIContext = React.createContext<CrowdaqAppState>({
  token: '',
  username: '',
  password: '',
  endpoint: '',
  baseUrl: '',
  tasks: []
});


export const CrowdaqClientTaskProgress = React.createContext<{ [key: string]: TaskProgress }>({});


export interface ExamSyncingState {
  state: 'syncing' | ''
  owner: string
  endpoint: string
  examId: string
  lastFinishTime: string
}

export interface TaskSyncingState {
  state: 'syncing' | ''
  owner: string
  endpoint: string,
  taskSetId: string
  lastFinishTime: string
}

export interface TaskPublishingState {

}

export interface ExamPublishingState {

}

export type UpdateCrowdaqUIContextHandler = (appState: CrowdaqAppState) => any;

function addTask(appState: CrowdaqAppState, task: Task): void {
  const exist = _.some(appState.tasks, t => t.id === task.id);

  if (exist) {
    return;
  }
  appState.tasks.push(task);
}

function updateTask(appState: CrowdaqAppState, task: Task): void {
  const idx = _.findIndex(appState.tasks, t => t.id === task.id);
  if (idx >= 0) {
    appState.tasks[idx] = task;
  }
}

// export function getDefaultContextHandler(appState: CrowdaqAppState, setAppStateFn: (appState: CrowdaqAppState) => any): UpdateCrowdaqUIContextHandler {
//   return {
//     setBaseUrl(baseUrl: string): void {
//       const nextState = produce(appState, draftState => {
//         draftState.baseUrl = baseUrl;
//       });
//       setAppStateFn(nextState);
//
//     },
//     addTask(task: Task): void {
//       const nextState = produce(appState, draftState => {
//         const exist = _.some(appState.tasks, t => t.id === task.id);
//
//         if (exist) {
//           return;
//         }
//         appState.tasks.push(task);
//       });
//       setAppStateFn(nextState);
//     },
//     updateTask(task: Task): void {
//       const nextState = produce(appState, draftState => {
//         const idx = _.findIndex(draftState.tasks, t => t.id === task.id);
//         if (idx >= 0) {
//           draftState.tasks[idx] = task;
//         }
//       });
//       setAppStateFn(nextState);
//     },
//     setEndpoint(endpoint: string): void {
//       const nextState = produce(appState, draftState => {
//         console.log(`Setting endpoint to ${endpoint}`);
//
//         draftState.endpoint = endpoint;
//       });
//       setAppStateFn(nextState);
//     },
//     setPassword(password: string): void {
//       const nextState = produce(appState, draftState => {
//
//           draftState.password = password;
//         }
//       );
//       setAppStateFn(nextState);
//     },
//     setToken(token: string): void {
//       const nextState = produce(appState, draftState => {
//         console.log(`Setting token to ${token}`);
//         draftState.token = token;
//       });
//       setAppStateFn(nextState);
//     },
//     setUsername(username: string): void {
//       const nextState = produce(appState, draftState => {
//         console.log(`Setting username to ${username}`);
//
//         draftState.username = username;
//       });
//       setAppStateFn(nextState);
//     },
//     setAppState: (appState: CrowdaqAppState) => {
//       setAppStateFn(appState);
//     }
//   };
// }


export function getAuthHeader(appState: CrowdaqAppState): any {
  return {
    authorization: `Bearer ${appState.token}`
  };
}

export function getAuthHeaderFromToken(token: string): any {
  return {
    authorization: `Bearer ${token}`
  };
}

export const UpdateCrowdaqUIContext = React.createContext<UpdateCrowdaqUIContextHandler>(() => {
});
