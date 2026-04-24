// Electron 主入口 - MVP 版本
const { app, BrowserWindow } = require('electron');
const path = require('path');

console.log('Electron app starting...');

let mainWindow = null;

function createWindow() {
  console.log('Creating window...');

  mainWindow = new BrowserWindow({
    width: 200,
    height: 200,
    x: 100,
    y: 100,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // 加载 HTML 文件
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  console.log('Window created and HTML loaded');
}

// 当 Electron 准备就绪时创建窗口
app.whenReady().then(() => {
  console.log('Electron is ready!');
  createWindow();
});

// 当所有窗口关闭时退出应用
app.on('window-all-closed', () => {
  console.log('All windows closed');
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  console.log('App is quitting');
});