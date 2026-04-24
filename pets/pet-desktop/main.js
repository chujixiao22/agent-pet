const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');

let mainWindow;
let isDragging = false;
let dragOffset = { x: 0, y: 0 };

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 200,
    height: 200,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // Remove default menu
  mainWindow.setMenu(null);

  // Create context menu
  const contextMenu = Menu.buildFromTemplate([
    {
      label: '退出',
      click: () => {
        app.quit();
      }
    }
  ]);

  mainWindow.webContents.on('context-menu', () => {
    contextMenu.popup();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle drag start from renderer
ipcMain.on('drag-start', (event, { x, y }) => {
  isDragging = true;
  dragOffset.x = x;
  dragOffset.y = y;
});

ipcMain.on('drag-move', (event, { x, y }) => {
  if (isDragging && mainWindow) {
    const [windowX, windowY] = mainWindow.getPosition();
    mainWindow.setPosition(windowX + x - dragOffset.x, windowY + y - dragOffset.y);
  }
});

ipcMain.on('drag-end', () => {
  isDragging = false;
});