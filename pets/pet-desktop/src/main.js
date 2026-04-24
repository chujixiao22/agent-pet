const { app, BrowserWindow, Menu, ipcMain, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { exec } = require('child_process');

// Default animation config (fallback for missing states)
const DEFAULT_ANIMATION_CONFIG = {
  idle: { fps: 8, frames: 12, loop: true },
  idle_long: { fps: 4, frames: 8, loop: true },
  working: { fps: 10, frames: 10, loop: true },
  thinking: { fps: 6, frames: 9, loop: true },
  success: { fps: 8, frames: 8, loop: false },
  error: { fps: 8, frames: 10, loop: false }
};

// Global directories
const GLOBAL_PET_DIR = path.join(os.homedir(), '.claw-pet');
const GLOBAL_SKINS_DIR = path.join(GLOBAL_PET_DIR, 'skins');
const GLOBAL_SKIN_CONFIG = path.join(GLOBAL_PET_DIR, 'skin-config.json');

// Parse --skin command-line argument
function getSkinName() {
  const args = process.argv.slice(1);
  for (let i = 0; i < args.length - 1; i++) {
    if (args[i] === '--skin') {
      return args[i + 1];
    }
  }
  // Fall back to global config
  const globalSkin = readGlobalSkinConfig();
  return globalSkin || 'default';
}

// Read global skin config from ~/.claw-pet/skin-config.json
function readGlobalSkinConfig() {
  try {
    if (fs.existsSync(GLOBAL_SKIN_CONFIG)) {
      const data = fs.readFileSync(GLOBAL_SKIN_CONFIG, 'utf-8');
      const config = JSON.parse(data);
      return config.skin || null;
    }
  } catch (err) {
    // ignore
  }
  return null;
}

// Load skin manifest - returns { name, displayName, states }
function loadSkinManifest(skinName) {
  let manifestPath;
  let manifest;

  if (skinName === 'default') {
    // Default skin uses the built-in sprites directory
    manifestPath = path.join(__dirname, '..', 'assets', 'sprites', 'manifest.json');
  } else {
    // Check global skins directory first
    const globalPath = path.join(GLOBAL_SKINS_DIR, skinName, 'manifest.json');
    if (fs.existsSync(globalPath)) {
      manifestPath = globalPath;
    } else {
      // Fall back to bundled skins directory
      manifestPath = path.join(__dirname, '..', 'assets', 'skins', skinName, 'manifest.json');
    }
  }

  try {
    if (fs.existsSync(manifestPath)) {
      const data = fs.readFileSync(manifestPath, 'utf-8');
      manifest = JSON.parse(data);
    } else {
      console.warn(`Skin manifest not found: ${manifestPath}, using default`);
      manifest = { name: 'default', displayName: '默认皮肤', states: DEFAULT_ANIMATION_CONFIG };
    }
  } catch (err) {
    console.error(`Failed to load skin manifest: ${err.message}`);
    manifest = { name: 'default', displayName: '默认皮肤', states: DEFAULT_ANIMATION_CONFIG };
  }

  // Merge with default config for missing states
  const mergedStates = { ...DEFAULT_ANIMATION_CONFIG };
  for (const [state, config] of Object.entries(manifest.states || {})) {
    mergedStates[state] = { ...DEFAULT_ANIMATION_CONFIG[state], ...config };
  }

  return {
    name: manifest.name || skinName,
    displayName: manifest.displayName || skinName,
    states: mergedStates
  };
}

// Get sprite base path for a skin
function getSkinSpritePath(skinName) {
  if (skinName === 'default') {
    return path.join(__dirname, '..', 'assets', 'sprites');
  }
  // Check global skins directory first
  const globalPath = path.join(GLOBAL_SKINS_DIR, skinName);
  if (fs.existsSync(globalPath)) {
    return globalPath;
  }
  // Fall back to bundled skins directory
  return path.join(__dirname, '..', 'assets', 'skins', skinName);
}

// Resolve skin: returns manifest and resolved skin name
function resolveSkin(skinName) {
  const manifest = loadSkinManifest(skinName);
  return {
    ...manifest,
    name: manifest.name || skinName
  };
}

let mainWindow;
let isDragging = false;
let dragInterval = null;
let dragStartMouse = { x: 0, y: 0 };
let dragStartWindow = { x: 0, y: 0 };

// Initialize skin configuration
const skinName = getSkinName();
const skinConfig = loadSkinManifest(skinName);
const skinSpritePath = getSkinSpritePath(skinName);

console.log(`[DesktopPet] Loading skin: ${skinConfig.displayName} (${skinName})`);

// Task watching
const TASK_EVENTS_PATH = path.join(os.homedir(), '.claw-pet', 'task-events.json');
let taskPollInterval = null;
let lastTaskKey = null;

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

  // Safety: stop dragging if window loses focus or is hidden
  mainWindow.on('blur', () => {
    stopDrag();
  });

  // Start polling task events after window is ready
  mainWindow.webContents.on('did-finish-load', () => {
    startTaskPolling();
    // Send skin config and sprite path to renderer
    mainWindow.webContents.send('skin-config', {
      ...skinConfig,
      spritePath: skinSpritePath
    });
  });
}

function stopDrag() {
  if (dragInterval) {
    clearInterval(dragInterval);
    dragInterval = null;
  }
  isDragging = false;
}

function startTaskPolling() {
  // Poll every 1 second
  taskPollInterval = setInterval(() => {
    readAndSendTasks();
  }, 1000);

  // Initial read
  readAndSendTasks();
}

function readAndSendTasks() {
  if (!mainWindow || mainWindow.isDestroyed()) return;

  let tasks = [];
  try {
    if (fs.existsSync(TASK_EVENTS_PATH)) {
      const data = fs.readFileSync(TASK_EVENTS_PATH, 'utf-8');
      const parsed = JSON.parse(data);
      if (parsed && Array.isArray(parsed.tasks)) {
        tasks = parsed.tasks;
      }
    }
  } catch (err) {
    // File doesn't exist or invalid JSON - no tasks
    tasks = [];
  }

  // Only update if data changed (compare by id, status, toolCount)
  const taskKey = tasks.map(t => `${t.id}:${t.status}:${t.toolCount}`).join('|');
  if (taskKey !== lastTaskKey) {
    lastTaskKey = taskKey;

    // Resize window based on task count
    const maxTasks = Math.min(tasks.length, 5);
    if (maxTasks > 0) {
      const panelHeight = Math.min(maxTasks * 36 + 8, 200);
      mainWindow.setSize(200, 200 + panelHeight);
    } else {
      mainWindow.setSize(200, 200);
    }

    // Send tasks to renderer (max 5)
    mainWindow.webContents.send('tasks-update', tasks.slice(0, 5));
  }
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

app.on('before-quit', () => {
  if (taskPollInterval) {
    clearInterval(taskPollInterval);
    taskPollInterval = null;
  }
});

// Handle drag start from renderer
ipcMain.on('drag-start', (event, { x, y }) => {
  if (isDragging) return;

  isDragging = true;
  dragStartMouse = { x, y };

  if (mainWindow) {
    const [windowX, windowY] = mainWindow.getPosition();
    dragStartWindow = { x: windowX, y: windowY };
  }

  // Use screen API to track mouse position at OS level every ~16ms (60fps)
  dragInterval = setInterval(() => {
    if (!isDragging || !mainWindow) {
      stopDrag();
      return;
    }

    const currentMouse = screen.getCursorScreenPoint();
    const deltaX = currentMouse.x - dragStartMouse.x;
    const deltaY = currentMouse.y - dragStartMouse.y;

    mainWindow.setPosition(
      dragStartWindow.x + deltaX,
      dragStartWindow.y + deltaY
    );
  }, 16);
});

ipcMain.on('drag-end', () => {
  stopDrag();
});

// Open project directory in VSCode
ipcMain.on('open-project', (event, cwd) => {
  exec(`code "${cwd}"`, (err) => {
    if (err) console.error('Failed to open VSCode:', err);
  });
});

// Dismiss a completed task
ipcMain.on('dismiss-task', (event, taskId) => {
  try {
    if (fs.existsSync(TASK_EVENTS_PATH)) {
      const data = fs.readFileSync(TASK_EVENTS_PATH, 'utf-8');
      const parsed = JSON.parse(data);
      if (parsed && Array.isArray(parsed.tasks)) {
        parsed.tasks = parsed.tasks.filter(t => t.id !== taskId);
        fs.writeFileSync(TASK_EVENTS_PATH, JSON.stringify(parsed, null, 2), 'utf-8');
        lastTaskKey = null; // Force refresh
        readAndSendTasks();
      }
    }
  } catch (err) {
    console.error('Failed to dismiss task:', err);
  }
});

// Handle skin change request
ipcMain.on('set-skin', (event, skinName) => {
  console.log(`[DesktopPet] Skin change requested: ${skinName}`);
  const resolvedSkin = resolveSkin(skinName);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('skin-config', {
      ...resolvedSkin,
      spritePath: getSkinSpritePath(resolvedSkin.name)
    });
  }
});
