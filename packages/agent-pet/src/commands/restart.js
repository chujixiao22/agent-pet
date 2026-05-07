const { spawn } = require('child_process');
const path = require('path');
const os = require('os');

async function restart() {
  console.log('🔄 Restarting agent-pet...');

  // 在 Windows 上尝试终止现有进程
  if (process.platform === 'win32') {
    const { execSync } = require('child_process');
    try {
      execSync('taskkill /F /IM electron.exe 2>nul', { shell: true, stdio: 'ignore' });
    } catch (e) {
      // 进程可能不存在，忽略
    }
  } else {
    try {
      execSync('pkill -f electron', { shell: true, stdio: 'ignore' });
    } catch (e) {
      // 进程可能不存在，忽略
    }
  }

  // 等待进程终止
  await new Promise(r => setTimeout(r, 500));

  // 查找 pet-desktop 目录
  const possiblePaths = [
    path.join(__dirname, '../../../../pets/pet-desktop'),
    path.join(process.cwd(), 'pets/pet-desktop'),
    path.join(os.homedir(), '.agent-pet/pets/pet-desktop')
  ];

  let desktopPath = null;
  for (const p of possiblePaths) {
    if (require('fs').existsSync(p)) {
      desktopPath = p;
      break;
    }
  }

  if (!desktopPath) {
    console.error('❌ pet-desktop not found');
    return;
  }

  const nodeModulesPath = path.join(desktopPath, 'node_modules');
  const electronPath = path.join(nodeModulesPath, '.bin/electron');
  const mainPath = path.join(desktopPath, 'src/main.js');

  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;

  console.log('🚀 Starting desktop pet...');

  if (process.platform === 'win32') {
    // Windows: 使用 PowerShell 启动 electron（隐藏窗口）
    const electronExe = path.join(nodeModulesPath, 'electron/dist/electron.exe');
    const psCommand = `\$env:ELECTRON_RUN_AS_NODE = \$null; Start-Process -FilePath "${electronExe}" -ArgumentList "${mainPath}" -WorkingDirectory "${desktopPath}" -WindowStyle Hidden`;
    spawn('powershell', ['-ExecutionPolicy', 'Bypass', '-Command', psCommand], {
      stdio: 'ignore',
      shell: true
    });
  } else {
    spawn(electronPath, [mainPath], {
      detached: true,
      env,
      cwd: desktopPath,
      stdio: 'ignore'
    }).unref();
  }

  console.log('✅ Desktop pet restarted');

  // 等待一小段时间让进程启动
  await new Promise(r => setTimeout(r, 500));
  process.exit(0);
}

module.exports = { restart };