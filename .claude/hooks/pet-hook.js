// Claude Code hooks script for desktop pet task tracking
// Receives hook event JSON on stdin, updates task-events.json
// Usage: node pet-hook.js < stdin

const fs = require('fs');
const path = require('path');
const os = require('os');

const EVENTS_DIR = path.join(os.homedir(), '.claw-pet');
const EVENTS_FILE = path.join(EVENTS_DIR, 'task-events.json');

function main() {
  let input = '';
  process.stdin.setEncoding('utf-8');
  process.stdin.on('data', (chunk) => { input += chunk; });
  process.stdin.on('end', () => {
    try {
      const data = JSON.parse(input || '{}');
      handleEvent(data);
    } catch (e) {
      // Silently exit on parse error
    }
    process.exit(0);
  });
}

function handleEvent(data) {
  const sessionId = data.session_id || 'unknown';
  const cwd = data.cwd || '';
  const toolName = data.tool_name || '';
  const hookEvent = data.hook_event_name || '';
  const timestamp = new Date().toISOString();

  // Initialize events file if missing
  let events = { tasks: [] };
  try {
    if (fs.existsSync(EVENTS_FILE)) {
      events = JSON.parse(fs.readFileSync(EVENTS_FILE, 'utf-8'));
      if (!Array.isArray(events.tasks)) events.tasks = [];
    }
  } catch (e) {
    events = { tasks: [] };
  }

  if (toolName) {
    // PreToolUse - update or create task (don't override completed)
    const summary = buildSummary(toolName, data.tool_input || {});
    const existing = events.tasks.find(t => t.id === sessionId);

    if (existing) {
      // Don't override: completed, interrupted, or waiting (set by Notification/PermissionRequest/AskUserQuestion)
      if (existing.status !== 'completed' && existing.status !== 'interrupted' && existing.status !== 'waiting') {
        existing.status = 'working';
        existing.lastActivity = timestamp;
        existing.toolCount = (existing.toolCount || 0) + 1;
        existing.lastTool = toolName;
        existing.lastToolSummary = summary;
        existing.completedAt = null;
      } else {
        // Still update toolCount and summary even if status stays waiting/working
        existing.lastActivity = timestamp;
        existing.toolCount = (existing.toolCount || 0) + 1;
        existing.lastTool = toolName;
        existing.lastToolSummary = summary;
      }
    } else {
      events.tasks.push({
        id: sessionId,
        cwd: cwd,
        status: toolName === 'AskUserQuestion' ? 'waiting' : 'working',
        startedAt: timestamp,
        lastActivity: timestamp,
        toolCount: 1,
        lastTool: toolName,
        lastToolSummary: summary,
        completedAt: null
      });
    }
  } else if (data.message || data.notification_type) {
    // Notification - Claude is waiting for user input (don't override completed)
    const existing = events.tasks.find(t => t.id === sessionId);
    if (existing && existing.status !== 'completed' && existing.status !== 'interrupted') {
      existing.status = 'waiting';
      existing.lastActivity = timestamp;
      existing.waitingMessage = (data.message || '').slice(0, 80);
    }
  } else if (hookEvent === 'PermissionRequest' || data.permission_required) {
    // PermissionRequest - Claude is asking for permission
    const existing = events.tasks.find(t => t.id === sessionId);
    if (existing && existing.status !== 'completed' && existing.status !== 'interrupted') {
      existing.status = 'waiting';
      existing.lastActivity = timestamp;
      existing.lastToolSummary = data.permission_required
        ? ('Permission: ' + String(data.permission_required).slice(0, 40))
        : 'Permission required';
    }
  } else if (data.prompt !== undefined) {
    // UserPromptSubmit - user sent a prompt, create task immediately (resume completed task)
    const existing = events.tasks.find(t => t.id === sessionId);
    if (!existing) {
      events.tasks.push({
        id: sessionId,
        cwd: cwd,
        status: 'working',
        startedAt: timestamp,
        lastActivity: timestamp,
        toolCount: 0,
        lastTool: '',
        lastToolSummary: 'Processing...',
        completedAt: null
      });
    } else {
      existing.status = 'working';
      existing.lastActivity = timestamp;
      existing.completedAt = null;
    }
  } else if (hookEvent === 'StopFailure') {
    // StopFailure - task was interrupted or errored
    const existing = events.tasks.find(t => t.id === sessionId);
    if (existing) {
      existing.status = 'interrupted';
      existing.completedAt = timestamp;
      existing.lastActivity = timestamp;
      existing.lastToolSummary = 'Interrupted';
    }
  } else {
    // Stop event - mark task as completed
    const existing = events.tasks.find(t => t.id === sessionId);
    if (existing) {
      existing.status = 'completed';
      existing.completedAt = timestamp;
      existing.lastActivity = timestamp;
    }
  }

  // No auto-cleanup — tasks stay until user dismisses them manually

  // Sort: working/waiting first, then interrupted, then completed; keep max 10
  const statusOrder = { working: 0, waiting: 0, interrupted: 1, completed: 2 };
  events.tasks.sort((a, b) => {
    const ao = statusOrder[a.status] ?? 3;
    const bo = statusOrder[b.status] ?? 3;
    if (ao !== bo) return ao - bo;
    return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime();
  });
  events.tasks = events.tasks.slice(0, 10);

  // Ensure directory exists
  if (!fs.existsSync(EVENTS_DIR)) {
    fs.mkdirSync(EVENTS_DIR, { recursive: true });
  }

  // Write atomically
  const tmp = EVENTS_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(events, null, 2), 'utf-8');
  fs.renameSync(tmp, EVENTS_FILE);
}

function buildSummary(toolName, toolInput) {
  switch (toolName) {
    case 'Bash': {
      const cmd = (toolInput.command || '').slice(0, 60);
      return 'Bash: ' + cmd;
    }
    case 'Edit':
    case 'Write':
    case 'Read':
      return toolName + ': ' + (toolInput.file_path || '');
    case 'Agent': {
      const desc = (toolInput.description || '').slice(0, 50);
      return 'Agent: ' + desc;
    }
    default:
      return toolName;
  }
}

main();
