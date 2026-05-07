const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const crypto = require('crypto');

const app = express();
app.use(express.json());
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Serve terminal-client static files
const terminalClientPath = path.resolve(__dirname, '..', '..', 'terminal-client', 'dist');
console.log('[Server] Serving terminal-client from:', terminalClientPath);
app.use(express.static(terminalClientPath));

// PTY Management
const terminals = new Map(); // sessionId -> { pty, ws, pid }
const sessions = new Map(); // sessionId -> { id, cwd, pid, status, toolCount, lastToolSummary, state }
const outputBuffers = new Map(); // sessionId -> string[] (for reconnection)

// State detection patterns
const STATE_PATTERNS = {
  thinking: /thinking|思考|thought/i,
  working: /using tool|使用工具|tool call|invoking|executing/i,
  reading: /reading|阅读|reading files/i
};

// Tool name extraction
const TOOL_PATTERN = /Using tool:\s*(.+?)(?:\n|$)|Tool:\s*(.+?)(?:\n|$)/i;

// Binary frame types
const FRAME_PTY = 0x00;
const FRAME_JSON = 0x01;

// Helper: create binary frame
function frame(type, data) {
  if (typeof data === 'string') {
    data = new TextEncoder().encode(data);
  }
  const header = Buffer.from([type]);
  return Buffer.concat([header, Buffer.from(data)]);
}

// Helper: parse binary frame
function parseFrame(buffer) {
  if (buffer.length < 1) return null;
  const type = buffer[0];
  const data = buffer.slice(1);
  return { type, data };
}

// Spawn PTY with proper settings
function spawnPty(cwd, sessionId, cols = 120, rows = 40) {
  const isWindows = process.platform === 'win32';
  const pty = require('node-pty');
  if (isWindows) {
    return pty.spawn('C:\\Users\\kezun\\AppData\\Roaming\\npm\\claude.cmd', ['--dangerously-skip-permissions', '--session-id', sessionId], {
      name: 'xterm-256color',
      cols,
      rows,
      cwd,
      env: { ...process.env },
      useConpty: true,
    });
  } else {
    return pty.spawn('claude', ['--dangerously-skip-permissions', '--session-id', sessionId], {
      name: 'xterm-256color',
      cols,
      rows,
      cwd,
      env: { ...process.env },
    });
  }
}

// Generate session ID (use UUID format to match hook)
function generateId() {
  return crypto.randomUUID();
}

// Update session state based on PTY output
function updateSessionState(sessionId, data) {
  const session = sessions.get(sessionId);
  if (!session) return;

  // Update state based on patterns
  if (STATE_PATTERNS.thinking.test(data)) {
    session.state = 'thinking';
  } else if (STATE_PATTERNS.working.test(data)) {
    session.state = 'working';
    // Try to extract tool name
    const match = data.match(TOOL_PATTERN);
    if (match) {
      const toolName = match[1] || match[2] || 'unknown';
      session.lastToolSummary = toolName;
      session.toolCount = (session.toolCount || 0) + 1;
    }
  }
}

// Buffer output for reconnection
function bufferOutput(sessionId, data) {
  if (!outputBuffers.has(sessionId)) {
    outputBuffers.set(sessionId, []);
  }
  const buffer = outputBuffers.get(sessionId);
  buffer.push(data);
  // Keep max 1000 lines
  if (buffer.length > 1000) {
    buffer.shift();
  }
}

// Get buffered output
function getBufferedOutput(sessionId) {
  return outputBuffers.get(sessionId) || [];
}

// Clear buffered output
function clearBufferedOutput(sessionId) {
  outputBuffers.delete(sessionId);
}

// WebSocket connections
wss.on('connection', (ws, req) => {
  console.log('[Server] New WebSocket connection');

  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });

  ws.on('message', (message) => {
    try {
      const buffer = Buffer.from(message);
      const frame = parseFrame(buffer);

      if (!frame) {
        console.error('[Server] Invalid frame received');
        return;
      }

      if (frame.type === FRAME_JSON) {
        // JSON control message
        const data = JSON.parse(frame.data.toString());
        handleMessage(ws, data);
      } else if (frame.type === FRAME_PTY) {
        // PTY raw input
        const input = frame.data.toString();
        if (ws.sessionId) {
          writeToPty(ws.sessionId, input);
        }
      }
    } catch (err) {
      console.error('[Server] Error handling message:', err);
    }
  });

  ws.on('close', () => {
    console.log('[Server] WebSocket disconnected');
    // Don't kill PTY on disconnect - just detach
    for (const [sessionId, term] of terminals.entries()) {
      if (term.ws === ws) {
        term.ws = null;
        break;
      }
    }
  });
});

// Heartbeat to detect dead connections
const heartbeat = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) {
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

wss.on('close', () => {
  clearInterval(heartbeat);
});

// Handle incoming JSON messages
function handleMessage(ws, data) {
  const { type, sessionId, cwd, cols, rows } = data;

  switch (type) {
    case 'init':
      // Client wants to attach to a session
      if (sessionId) {
        attachSession(ws, sessionId);
      }
      break;

    case 'create':
      createSession(ws, cwd, cols || 120, rows || 40);
      break;

    case 'resize':
      resizePty(sessionId, cols, rows);
      break;

    case 'kill':
      killSession(sessionId);
      break;

    default:
      console.log('[Server] Unknown message type:', type);
  }
}

// Create new PTY session
function createSession(ws, cwd, cols = 120, rows = 40) {
  const id = generateId();
  const workingDir = cwd || process.cwd();

  console.log(`[Server] Creating session ${id} in ${workingDir}`);

  try {
    const pty = spawnPty(workingDir, id, cols, rows);

    terminals.set(id, { pty, ws, pid: pty.pid });
    ws.sessionId = id;

    const session = {
      id,
      cwd: workingDir,
      pid: pty.pid,
      status: 'running',
      state: 'idle',
      toolCount: 0,
      lastToolSummary: ''
    };
    sessions.set(id, session);
    outputBuffers.set(id, []);

    // Handle PTY exit
    pty.onExit(({ exitCode }) => {
      console.log(`[Server] PTY ${id} exited with code ${exitCode}`);
      terminals.delete(id);
      const s = sessions.get(id);
      if (s) {
        s.status = 'exited';
      }
      broadcastSessions();
      clearBufferedOutput(id);
    });

    // Forward output to attached client
    pty.onData((data) => {
      bufferOutput(id, data);
      updateSessionState(id, data);
      const term = terminals.get(id);
      if (term && term.ws && term.ws.readyState === WebSocket.OPEN) {
        term.ws.send(frame(FRAME_PTY, data));
      }
    });

    // Send ready message
    ws.send(frame(FRAME_JSON, JSON.stringify({
      type: 'ready',
      sessionId: id,
      pid: pty.pid,
      cwd: workingDir
    })));

    broadcastSessions();
    console.log(`[Server] Session ${id} created with PID ${pty.pid}`);
  } catch (err) {
    console.error('[Server] Error creating session:', err);
    ws.send(frame(FRAME_JSON, JSON.stringify({ type: 'error', message: err.message })));
  }
}

// Attach to existing session
function attachSession(ws, sessionId) {
  const term = terminals.get(sessionId);
  const session = sessions.get(sessionId);

  if (!term || !session) {
    ws.send(frame(FRAME_JSON, JSON.stringify({ type: 'error', message: 'Session not found' })));
    return;
  }

  console.log(`[Server] Attaching to session ${sessionId}`);

  // Update ws reference
  term.ws = ws;
  ws.sessionId = sessionId;

  // Send ready message
  ws.send(frame(FRAME_JSON, JSON.stringify({
    type: 'ready',
    sessionId: sessionId,
    pid: session.pid,
    cwd: session.cwd
  })));

  // Send buffered output (last 100 lines)
  const buffer = getBufferedOutput(sessionId);
  if (buffer.length > 0) {
    const recentOutput = buffer.slice(-100).join('');
    ws.send(frame(FRAME_PTY, '\r\n[Reconnected - showing last output]\r\n'));
    ws.send(frame(FRAME_PTY, recentOutput));
  }
}

// Write to PTY
function writeToPty(sessionId, input) {
  const term = terminals.get(sessionId);
  if (term) {
    term.pty.write(input);
  }
}

// Resize PTY
function resizePty(sessionId, cols, rows) {
  const term = terminals.get(sessionId);
  if (term) {
    term.pty.resize(cols, rows);
  }
}

// Kill session
function killSession(sessionId) {
  const term = terminals.get(sessionId);
  if (term) {
    console.log(`[Server] Killing session ${sessionId}`);
    term.pty.kill();
    terminals.delete(sessionId);
  }
  sessions.delete(sessionId);
  clearBufferedOutput(sessionId);
  broadcastSessions();
}

// List all sessions
function listSessions(ws) {
  const sessionList = Array.from(sessions.values());
  ws.send(frame(FRAME_JSON, JSON.stringify({ type: 'sessions', sessions: sessionList })));
}

// Broadcast session list to all connected clients
function broadcastSessions() {
  const sessionList = Array.from(sessions.values());
  const message = frame(FRAME_JSON, JSON.stringify({ type: 'sessions', sessions: sessionList }));

  for (const [, term] of terminals) {
    if (term.ws && term.ws.readyState === WebSocket.OPEN) {
      term.ws.send(message);
    }
  }
}

// API endpoints
app.get('/api/sessions', (req, res) => {
  res.json(Array.from(sessions.values()));
});

app.post('/api/sessions', (req, res) => {
  const { cwd } = req.body;
  if (!cwd) {
    return res.status(400).json({ error: 'cwd is required' });
  }

  const id = generateId();
  const workingDir = cwd;

  try {
    const pty = spawnPty(workingDir, id, 120, 40);

    terminals.set(id, { pty, ws: null, pid: pty.pid });

    const session = {
      id,
      cwd: workingDir,
      pid: pty.pid,
      status: 'running',
      state: 'idle',
      toolCount: 0,
      lastToolSummary: ''
    };
    sessions.set(id, session);
    outputBuffers.set(id, []);

    pty.onExit(({ exitCode }) => {
      terminals.delete(id);
      const s = sessions.get(id);
      if (s) {
        s.status = 'exited';
      }
      broadcastSessions();
      clearBufferedOutput(id);
    });

    pty.onData((data) => {
      bufferOutput(id, data);
      updateSessionState(id, data);
      const term = terminals.get(id);
      if (term && term.ws && term.ws.readyState === WebSocket.OPEN) {
        term.ws.send(frame(FRAME_PTY, data));
      }
    });

    res.json(session);
    console.log(`[Server] Session ${id} created via REST API`);
  } catch (err) {
    console.error('[Server] Error creating session:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/sessions/:id', (req, res) => {
  const { id } = req.params;
  killSession(id);
  res.json({ success: true });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Serve terminal-client for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(terminalClientPath, 'index.html'));
});

// Start server
const PORT = 3456;
server.listen(PORT, () => {
  console.log(`[Server] Terminal server running on http://localhost:${PORT}`);
  console.log(`[Server] WebSocket server running on ws://localhost:${PORT}`);
});
