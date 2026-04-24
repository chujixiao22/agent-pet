// 真正的桌面悬浮宠物 - Electron 主进程
const { app, BrowserWindow, screen } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  // 加载保存的位置
  let windowX, windowY;
  const configPath = path.join(__dirname, 'pet-position.json');

  try {
    if (fs.existsSync(configPath)) {
      const pos = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      windowX = pos.x;
      windowY = pos.y;
    }
  } catch (e) {}

  // 默认位置：右下角
  if (windowX === undefined) {
    windowX = width - 220;
    windowY = height - 220;
  }

  mainWindow = new BrowserWindow({
    width: 200,
    height: 200,
    x: windowX,
    y: windowY,

    // 关键：透明、悬浮、无边框
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    hasShadow: false,
    focusable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // 加载宠物页面
  mainWindow.loadFile(path.join(__dirname, 'desktop-pet.html'));

  // 保存窗口位置
  mainWindow.on('moved', () => {
    const [x, y] = mainWindow.getPosition();
    fs.writeFileSync(configPath, JSON.stringify({ x, y }));
  });

  // 隐藏菜单栏
  mainWindow.setMenu(null);

  // 窗口关闭时隐藏而不是退出
  mainWindow.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  console.log('🦊 桌面宠物已启动！');
  console.log('位置:', windowX, windowY);
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  app.isQuitting = true;
});