/* eslint global-require: off, no-console: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `yarn build` or `yarn build-main`, this file is compiled to
 * `./app/main.prod.js` using webpack. This gives us some performance wins.
 */
import 'core-js/stable';
import 'regenerator-runtime/runtime';
import path from 'path';
import { app, BrowserWindow } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import MenuBuilder from './menu';
import { WorkerProgressUpdateChannel, WorkerRequestChannel } from './workerRequests';

const { ipcMain, webContents } = require('electron');

export default class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

let mainWindow: BrowserWindow | null = null;
let workerWindow: BrowserWindow | null = null;

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

if (
  process.env.NODE_ENV === 'development' ||
  process.env.DEBUG_PROD === 'true'
) {
  require('electron-debug')();
}

const installExtensions = async () => {
  console.log('Installing react dev tool');
  const installer = require('electron-devtools-installer');

  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS', 'REDUX_DEVTOOLS'];

  return Promise.all(
    extensions.map((name) => installer.default(installer[name], forceDownload))
  ).catch(console.log);
};

const createWindow = async () => {
  if (
    process.env.NODE_ENV === 'development' ||
    process.env.DEBUG_PROD === 'true'
  ) {
    await installExtensions();
    console.log('Finished installing react dev tool');
  }

  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'resources')
    : path.join(__dirname, '../resources');

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths);
  };

  mainWindow = new BrowserWindow({
    show: false,
    width: 1024,
    height: 728,
    icon: getAssetPath('icon.png'),
    webPreferences:
      (process.env.NODE_ENV === 'development' ||
        process.env.E2E_BUILD === 'true') &&
      process.env.ERB_SECURE !== 'true'
        ? {
          nodeIntegration: true
        }
        : {
          preload: path.join(__dirname, 'dist/renderer.prod.js')
        }
  });

  mainWindow.loadURL(`file://${__dirname}/app.html`);

  // @TODO: Use 'ready-to-show' event
  //        https://github.com/electron/electron/blob/master/docs/api/browser-window.md#using-ready-to-show-event
  mainWindow.webContents.on('did-finish-load', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
      mainWindow.focus();

      // mainWindow.webContents.openDevTools()

      // console.log(process.env.NODE_ENV);
      //
      // if (process.env.NODE_ENV === 'development') {
      // }

    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  workerWindow = new BrowserWindow({
    show: false,
    webPreferences:
      (process.env.NODE_ENV === 'development' || process.env.E2E_BUILD === 'true') && process.env.ERB_SECURE !== 'true'
        ? {
          nodeIntegration: true
        }
        : {
          preload: path.join(__dirname, 'dist/worker.prod.js')
        }
  });
  // workerWindow.loadFile('worker.html');
  workerWindow.loadURL(`file://${__dirname}/worker.html`);
  workerWindow.webContents.on('did-finish-load', () => {
    if (!workerWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    console.log('workerWindow started.');
  });

  workerWindow.on('closed', () => {
    workerWindow = null;
  });


  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  new AppUpdater();


};

/**
 * Add event listeners...
 */

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

if (process.env.E2E_BUILD === 'true') {
  // eslint-disable-next-line promise/catch-or-return
  app.whenReady().then(createWindow);
} else {
  app.on('ready', createWindow);
}

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) createWindow();
});


ipcMain.on(WorkerRequestChannel, (event, arg) => {
  console.log('Received-worker-request:');
  console.log(arg); // prints "ping"
  if (workerWindow) {
    workerWindow.webContents.send(WorkerRequestChannel, arg);
    // event.reply('worker-request-reply', { success: true });
  } else {
    // event.reply('worker-request-reply', { success: true, reason: 'worker process not ready.' });
  }
});

ipcMain.on(WorkerProgressUpdateChannel, (event, arg) => {
  console.log('Received worker progress update:');
  console.log(arg);
  if (mainWindow) {
    mainWindow.webContents.send(WorkerProgressUpdateChannel, arg);
  }
});

