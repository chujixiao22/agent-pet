const { spawn } = require('child_process');

console.log('Starting Electron...');

const electron = spawn('electron', ['.', '--inspect=5858']);

electron.stdout.on('data', (data) => {
  console.log(`Electron: ${data}`);
});

electron.stderr.on('data', (data) => {
  console.error(`Electron error: ${data}`);
});

electron.on('close', (code) => {
  console.log(`Electron exited with code ${code}`);
});