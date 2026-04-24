/**
 * Claude Code Status Monitor
 *
 * Monitors Claude Code status and updates status.json
 * Directory: f:/codes/claw-pet/pets/status-monitor/
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

// Configuration
const PROJECT_PATH = 'f:/codes/claw-pet';
const STATUS_FILE = path.join(PROJECT_PATH, 'pets', 'status-monitor', 'status.json');
const TASKS_FILE = path.join(PROJECT_PATH, '.claude', 'tasks.json');
const UPDATE_INTERVAL = 2000; // 2 seconds
const IDLE_THRESHOLD = 5 * 60 * 1000; // 5 minutes

// Status types
type Status = 'Idle' | 'Working' | 'Thinking' | 'Success' | 'Error' | 'Idle_Long';

interface StatusData {
  status: Status;
  project: string;
  message: string;
  tasks: number;
  lastUpdate: number;
}

/**
 * Read current status from status.json
 */
function readStatus(): StatusData {
  try {
    const content = fs.readFileSync(STATUS_FILE, 'utf-8');
    return JSON.parse(content);
  } catch {
    return {
      status: 'Idle',
      project: 'claw-pet',
      message: '等待中...',
      tasks: 0,
      lastUpdate: Date.now()
    };
  }
}

/**
 * Write status to status.json
 */
function writeStatus(data: StatusData): void {
  fs.writeFileSync(STATUS_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * Check if Claude Code process is running
 */
function isClaudeCodeRunning(): boolean {
  try {
    // On Windows, use tasklist to check for Claude Code process
    const output = execSync('tasklist /FI "IMAGENAME eq Claude*" 2>nul', {
      encoding: 'utf-8',
      cwd: PROJECT_PATH
    });
    return output.includes('Claude');
  } catch {
    return false;
  }
}

/**
 * Get current git branch
 */
function getGitBranch(): string | null {
  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD 2>nul', {
      encoding: 'utf-8',
      cwd: PROJECT_PATH
    }).trim();
    return branch || null;
  } catch {
    return null;
  }
}

/**
 * Check if there are uncommitted changes
 */
function hasUncommittedChanges(): boolean {
  try {
    const output = execSync('git status --porcelain 2>nul', {
      encoding: 'utf-8',
      cwd: PROJECT_PATH
    }).trim();
    return output.length > 0;
  } catch {
    return false;
  }
}

/**
 * Get number of active tasks from tasks.json
 */
function getTaskCount(): number {
  try {
    const tasksDir = path.join(PROJECT_PATH, '.claude');
    if (!fs.existsSync(tasksDir)) {
      return 0;
    }

    const tasksFile = path.join(tasksDir, 'tasks.json');
    if (!fs.existsSync(tasksFile)) {
      return 0;
    }

    const content = fs.readFileSync(tasksFile, 'utf-8');
    const tasks = JSON.parse(content);

    // Count active tasks (status !== 'completed' && status !== 'failed')
    if (Array.isArray(tasks)) {
      return tasks.filter((t: any) =>
        t.status !== 'completed' && t.status !== 'failed'
      ).length;
    }

    return 0;
  } catch {
    return 0;
  }
}

/**
 * Get git status information
 */
function getGitStatus(): { branch: string | null; hasChanges: boolean } {
  return {
    branch: getGitBranch(),
    hasChanges: hasUncommittedChanges()
  };
}

/**
 * Determine status based on various signals
 */
function determineStatus(
  isRunning: boolean,
  taskCount: number,
  lastUpdate: number,
  gitStatus: { branch: string | null; hasChanges: boolean }
): Status {
  const now = Date.now();
  const idleTime = now - lastUpdate;

  // Check for Claude Code activity
  if (!isRunning) {
    // Claude Code not running
    if (idleTime > IDLE_THRESHOLD) {
      return 'Idle_Long';
    }
    return 'Idle';
  }

  // Claude Code is running
  if (taskCount > 0) {
    return 'Working';
  }

  // Check git status for activity hints
  if (gitStatus.hasChanges || gitStatus.branch) {
    // Still potentially active
    if (idleTime > IDLE_THRESHOLD) {
      return 'Idle_Long';
    }
    return 'Working';
  }

  return 'Idle';
}

/**
 * Get status message based on current state
 */
function getStatusMessage(
  status: Status,
  gitStatus: { branch: string | null; hasChanges: boolean },
  taskCount: number
): string {
  switch (status) {
    case 'Idle':
      if (gitStatus.branch) {
        const branchInfo = gitStatus.hasChanges ? ` (${gitStatus.branch}*)` : ` (${gitStatus.branch})`;
        return `空闲中${branchInfo}`;
      }
      return '等待中...';
    case 'Idle_Long':
      return '长时间空闲中...';
    case 'Working':
      if (taskCount > 0) {
        return `执行 ${taskCount} 个任务中...`;
      }
      if (gitStatus.hasChanges) {
        return `处理 ${gitStatus.branch} 分支更改...`;
      }
      return 'Claude Code 执行中...';
    case 'Thinking':
      return '思考中...';
    case 'Success':
      return '任务完成!';
    case 'Error':
      return '出现错误';
    default:
      return '等待中...';
  }
}

/**
 * Main monitoring loop
 */
function startMonitoring(): void {
  console.log('[Status Monitor] Starting Claude Code status monitor...');
  console.log(`[Status Monitor] Monitoring project: ${PROJECT_PATH}`);
  console.log(`[Status Monitor] Update interval: ${UPDATE_INTERVAL}ms`);

  let lastStatus: Status = 'Idle';
  let lastUpdateTime = Date.now();

  // Initialize status file if needed
  if (!fs.existsSync(STATUS_FILE)) {
    writeStatus({
      status: 'Idle',
      project: 'claw-pet',
      message: '等待中...',
      tasks: 0,
      lastUpdate: Date.now()
    });
  }

  const intervalId = setInterval(() => {
    try {
      // Gather all status information
      const isRunning = isClaudeCodeRunning();
      const taskCount = getTaskCount();
      const gitStatus = getGitStatus();
      const currentTime = Date.now();

      // Determine status
      const status = determineStatus(isRunning, taskCount, lastUpdateTime, gitStatus);

      // Update lastUpdateTime when status changes
      if (status !== lastStatus) {
        lastStatus = status;
        lastUpdateTime = currentTime;
      }

      // Get appropriate message
      const message = getStatusMessage(status, gitStatus, taskCount);

      // Create status data
      const statusData: StatusData = {
        status,
        project: gitStatus.branch || 'claw-pet',
        message,
        tasks: taskCount,
        lastUpdate: currentTime
      };

      // Write status to file
      writeStatus(statusData);

    } catch (error) {
      console.error('[Status Monitor] Error:', error);
    }
  }, UPDATE_INTERVAL);

  // Handle shutdown
  process.on('SIGINT', () => {
    console.log('\n[Status Monitor] Shutting down...');
    clearInterval(intervalId);
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n[Status Monitor] Shutting down...');
    clearInterval(intervalId);
    process.exit(0);
  });
}

// Start monitoring
startMonitoring();