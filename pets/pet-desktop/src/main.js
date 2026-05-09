const { app, BrowserWindow, Menu, ipcMain, screen, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { exec, spawn } = require('child_process');

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
const GLOBAL_PET_DIR = path.join(os.homedir(), '.agent-pet');
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

// Read global skin config from ~/.agent-pet/skin-config.json
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

// --- connection error logger with throttling ---
const _connLogState = new Map(); // key -> timestamp of last log
function logConnError(key, err) {
  const now = Date.now();
  const msg = String(err && (err.cause?.code || err.message || err));
  const isRefused = /ECONNREFUSED|fetch failed|ENOTFOUND|ECONNRESET/i.test(msg);
  const throttleMs = isRefused ? 30_000 : 0; // 连接类错误 30s 节流；其他错误每次打
  const last = _connLogState.get(key) || 0;
  if (throttleMs && now - last < throttleMs) return;
  _connLogState.set(key, now);
  console.warn(`[Main] ${key}:`, msg);
}

let mainWindow;
let isDragging = false;
let dragInterval = null;
let dragStartMouse = { x: 0, y: 0 };
let dragStartWindow = { x: 0, y: 0 };
let wsMap = {}; // sessionId -> WebSocket



// Initialize skin configuration
const skinName = getSkinName();
const skinConfig = loadSkinManifest(skinName);
const skinSpritePath = getSkinSpritePath(skinName);

console.log(`[DesktopPet] Loading skin: ${skinConfig.displayName} (${skinName})`);

// Task watching
let taskPollInterval = null;



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
  taskPollInterval = setInterval(async () => {
    await refreshAll();
  }, 1000);

  // Initial read
  refreshAll();
}

async function refreshAll() {
  if (!mainWindow || mainWindow.isDestroyed()) return;

  try {
    // Fetch hook tasks from terminal-server
    let hookTasks = [];
    try {
      const hookResp = await fetch('http://localhost:3456/api/hooks');
      hookTasks = await hookResp.json();
    } catch (e) { logConnError('hooks fetch failed', e); }

    // Sort hook tasks
    const statusOrder = { working: 0, waiting: 0, interrupted: 1, completed: 2 };
    hookTasks.sort((a, b) => {
      const ao = statusOrder[a.status] !== undefined ? statusOrder[a.status] : 3;
      const bo = statusOrder[b.status] !== undefined ? statusOrder[b.status] : 3;
      if (ao !== bo) return ao - bo;
      return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime();
    });

    // Fetch sessions from terminal-server
    let sessions = [];
    try {
      const resp = await fetch('http://localhost:3456/api/sessions');
      sessions = await resp.json();
    } catch (e) { logConnError('sessions fetch failed', e); }

    // Send updates to renderer - filter out tasks that have corresponding sessions
    const sessionIds = new Set(sessions.map(s => s.id));
    const filteredTasks = hookTasks.filter(t => !sessionIds.has(t.id));
    mainWindow.webContents.send('tasks-update', filteredTasks.slice(0, 5));

    // Build task lookup by id
    const taskById = {};
    for (const t of hookTasks) {
      taskById[t.id] = t;
    }

    const mapped = sessions.map(s => {
      const task = taskById[s.id];
      return {
        id: s.id,
        type: 'manual',
        cwd: task ? task.cwd : s.cwd,
        pid: s.pid,
        status: task ? task.status : s.status,
        state: s.state || 'idle',
        toolCount: task ? (task.toolCount || 0) : (s.toolCount || 0),
        lastToolSummary: task ? (task.lastToolSummary || '') : (s.lastToolSummary || '')
      };
    });
    mainWindow.webContents.send('sessions-update', mapped);

    // Resize window
    const displayedItems = filteredTasks.length + mapped.length;
    const itemHeight = 56;
    const addButtonHeight = 48;
    const panelPadding = 12;
    if (displayedItems > 0) {
      const panelHeight = displayedItems * itemHeight + addButtonHeight + panelPadding;
      mainWindow.setSize(260, 140 + panelHeight);
    } else {
      mainWindow.setSize(260, 220);
    }
  } catch (err) {
    console.error('[Main] Refresh error:', err);
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
  // Dismiss via terminal-server
  fetch(`http://localhost:3456/api/hooks/${taskId}`, { method: 'DELETE' })
    .catch(e => logConnError('hook delete failed', e));
  refreshAll();
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

// Claude process management
ipcMain.handle('select-working-directory', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Select Working Directory'
  });
  if (result.canceled || !result.filePaths[0]) {
    return null;
  }
  return result.filePaths[0];
});

ipcMain.handle('claude-spawn', async (event, cwd) => {
  console.log(`[IPC] claude-spawn called with cwd: ${cwd}`);
  try {
    const response = await fetch('http://localhost:3456/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cwd })
    });
    const session = await response.json();
    console.log(`[IPC] Session created via terminal-server: ${session.id}`);
    return session;
  } catch (err) {
    console.error('[IPC] Failed to create session:', err);
    throw err;
  }
});

ipcMain.handle('claude-write', async (event, { id, input }) => {
  // Forward to terminal-server via WebSocket
  if (wsMap && wsMap[id]) {
    wsMap[id].send(JSON.stringify({ type: 'write', sessionId: id, input }));
  }
  return true;
});


ipcMain.handle('claude-kill', async (event, id) => {
  console.log(`[IPC] claude-kill called for session ${id}`);
  try {
    await fetch(`http://localhost:3456/api/sessions/${id}`, { method: 'DELETE' });
    return true;
  } catch (err) {
    console.error('[IPC] Failed to kill session:', err);
    return false;
  }
});


// Store terminal windows by sessionId
const terminalWindows = new Map();

ipcMain.handle('open-terminal-client', async (event, sessionId) => {
  const url = `http://localhost:3456/?session=${sessionId}`;
  console.log(`[IPC] Opening terminal client at ${url}`);
  require('child_process').exec(`powershell -Command "Start-Process '${url}'"`);
  return true;
});


ipcMain.handle('get-sessions', async () => {
  try {
    const response = await fetch('http://localhost:3456/api/sessions');
    const sessions = await response.json();
    // Convert to the format expected by renderer
    return sessions.map(s => ({
      id: s.id,
      type: 'manual',
      cwd: s.cwd,
      pid: s.pid,
      status: s.status
    }));
  } catch (err) {
    console.error('[IPC] Failed to get sessions:', err);
    return [];
  }
});
