const { app, BrowserWindow, ipcMain, Menu, screen } = require('electron');
const path = require('path');
const fs = require('fs');

// Status file path
const STATUS_FILE = 'f:/codes/claw-pet/pets/status-monitor/status.json';

// Current status
let currentStatus = 'idle';
let mainWindow = null;

// Get saved window position
function getSavedPosition() {
  const configPath = path.join(__dirname, '..', '..', 'pet-config', 'window-position.json');
  try {
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, 'utf8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.log('No saved position found');
  }
  return null;
}

// Save window position
function savePosition(position) {
  const configPath = path.join(__dirname, '..', '..', 'pet-config', 'window-position.json');
  try {
    fs.writeFileSync(configPath, JSON.stringify(position, null, 2));
  } catch (e) {
    console.log('Failed to save position:', e);
  }
}

// Create the main window
function createWindow() {
  const savedPos = getSavedPosition();
  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;

  const windowConfig = {
    width: 180,
    height: 180,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    hasShadow: false,
    focusable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  };

  // Apply saved position or default to bottom-right
  if (savedPos && savedPos.x !== undefined && savedPos.y !== undefined) {
    windowConfig.x = savedPos.x;
    windowConfig.y = savedPos.y;
  } else {
    windowConfig.x = screenWidth - 200;
    windowConfig.y = screenHeight - 200;
  }

  mainWindow = new BrowserWindow(windowConfig);

  // Load the HTML file
  mainWindow.loadFile(path.join(__dirname, '..', 'index.html'));

  // Remove menu
  mainWindow.setMenu(null);

  // Log when window is ready
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('Pet window loaded successfully');
    mainWindow.webContents.send('initial-status', currentStatus);
  });

  // Save position when window moves
  mainWindow.on('moved', () => {
    const bounds = mainWindow.getBounds();
    savePosition({ x: bounds.x, y: bounds.y });
  });

  // Handle window close (hide instead of close)
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

// Read status from file
function readStatusFile() {
  try {
    if (fs.existsSync(STATUS_FILE)) {
      const data = fs.readFileSync(STATUS_FILE, 'utf8');
      const statusData = JSON.parse(data);
      const status = statusData.status || 'idle';
      // Normalize to lowercase for case-insensitive matching
      return status.toLowerCase();
    }
  } catch (e) {
    console.log('Error reading status file:', e);
  }
  return 'idle';
}

// Poll status file
function pollStatus() {
  const newStatus = readStatusFile();
  if (newStatus !== currentStatus) {
    currentStatus = newStatus;
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('status-change', currentStatus);
    }
  }
}

// Create context menu
function createContextMenu() {
  const template = [
    {
      label: 'Show',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.webContents.send('show-pet');
        }
      }
    },
    {
      label: 'Hide',
      click: () => {
        if (mainWindow) {
          mainWindow.hide();
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Exit',
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ];

  return Menu.buildFromTemplate(template);
}

// IPC Handlers
ipcMain.on('get-status', (event) => {
  event.returnValue = currentStatus;
});

ipcMain.on('get-config', (event) => {
  const configPath = path.join(__dirname, '..', '..', 'pet-config', 'config.json');
  try {
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, 'utf8');
      event.returnValue = JSON.parse(data);
    } else {
      event.returnValue = { name: 'Pet', type: 'fox-cat' };
    }
  } catch (e) {
    console.log('Error reading config:', e);
    event.returnValue = { name: 'Pet', type: 'fox-cat' };
  }
});

ipcMain.on('show-context-menu', (event) => {
  const contextMenu = createContextMenu();
  contextMenu.popup({ window: BrowserWindow.fromWebContents(event.sender) });
});

ipcMain.on('show-message', (event, message) => {
  // Show a small notification window or tooltip
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('display-message', message);
  }
});

// App events
app.whenReady().then(() => {
  createWindow();

  // Start polling status file every second
  setInterval(pollStatus, 1000);

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

app.on('before-quit', () => {
  app.isQuitting = true;
});
