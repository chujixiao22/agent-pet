/**
 * Claude Code Pet Skill
 *
 * Trigger: /pets
 *
 * Usage:
 *   /pets        - Show pet
 *   /pets help   - Show help
 *   /pets config - Open config file
 *   /pets hide   - Hide pet
 *   /pets show   - Show pet
 */

import { exec, spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

const PET_CLIENT_PATH = path.join(__dirname, '../pet-client');
const CONFIG_PATH = path.join(__dirname, '../pet-config/config.json');

// IPC command constants for type safety
const IPC_COMMANDS = {
  SHOW: 'show',
  HIDE: 'hide',
} as const;
type IpcCommand = typeof IPC_COMMANDS[keyof typeof IPC_COMMANDS];

/**
 * Check if the pet client process is running
 */
async function isPetClientRunning(): Promise<boolean> {
  return new Promise((resolve) => {
    const isWindows = process.platform === 'win32';
    const checkCmd = isWindows
      ? 'tasklist | findstr electron'
      : 'pgrep -f electron';

    exec(checkCmd, (error: Error | null) => {
      resolve(!error);
    });
  });
}

/**
 * Launch the Electron pet client
 */
async function launchPetClient(): Promise<void> {
  const isRunning = await isPetClientRunning();

  if (isRunning) {
    await sendToPet(IPC_COMMANDS.SHOW);
    return;
  }

  // Start new process (detached so it continues after parent exits)
  spawn('npx', ['electron', '.'], {
    cwd: PET_CLIENT_PATH,
    detached: true,
    stdio: 'ignore'
  }).unref();
}

/**
 * Send command to running pet client via file-based IPC
 * Uses atomic write (temp file + rename) to prevent race conditions
 */
async function sendToPet(command: IpcCommand): Promise<void> {
  const ipcFile = path.join(PET_CLIENT_PATH, '.pet-ipc');
  const tempFile = path.join(PET_CLIENT_PATH, '.pet-ipc-tmp');

  const message = JSON.stringify({
    command,
    timestamp: Date.now()
  });

  // Atomic write: write to temp file, then rename (atomic on most filesystems)
  await fs.promises.writeFile(tempFile, message, 'utf8');
  await fs.promises.rename(tempFile, ipcFile);
}

/**
 * Show help information
 */
async function showHelp(): Promise<void> {
  console.log(`
Claude Pet - Electronic Pet for Claude Code

Usage:
  /pets        - Launch and show your pet
  /pets help    - Show this help message
  /pets config  - Open configuration file
  /pets hide    - Hide your pet
  /pets show    - Show your pet

Your pet will react to Claude Code's status!
  `);
}

/**
 * Open configuration file
 */
async function openConfig(): Promise<void> {
  const editor = process.env.EDITOR || 'notepad';
  spawn(editor, [CONFIG_PATH], { detached: true }).unref();
}

/**
 * Main skill handler
 */
export async function pets(args: string[]): Promise<void> {
  const subcommand = args[0];

  switch (subcommand) {
    case undefined:
      await launchPetClient();
      break;
    case 'help':
      await showHelp();
      break;
    case 'config':
      await openConfig();
      break;
    case 'hide':
      await sendToPet(IPC_COMMANDS.HIDE);
      break;
    case 'show':
      await sendToPet(IPC_COMMANDS.SHOW);
      break;
    default:
      console.log(`Unknown command: ${subcommand}`);
      console.log('Use /pets help for usage information');
  }
}