const { app, BrowserWindow, ipcMain, Menu } = require('electron');

if (app === undefined) {
  console.error('Electron app is undefined!');
  process.exit(1);
}
const path = require('path');
const fs = require('fs');

let mainWindow = null;

function createWindow() {
  const { width, height } = require('screen').getPrimaryDisplay().workAreaSize;

  mainWindow = new BrowserWindow({
    width: 180,
    height: 180,
    x: width - 200,
    y: height - 200,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    hasShadow: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      preload: path.join(__dirname, 'src', 'preload.js')
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers
ipcMain.on('get-status', (event) => {
  const statuses = ['idle', 'working', 'thinking', 'success', 'error', 'idle_long'];
  const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
  event.returnValue = randomStatus;
});

ipcMain.on('get-config', (event) => {
  event.returnValue = { name: 'Whiskers', type: 'fox-cat' };
});

ipcMain.on('show-message', (event, message) => {
  console.log('Message:', message);
});

ipcMain.on('exit', () => {
  app.quit();
});