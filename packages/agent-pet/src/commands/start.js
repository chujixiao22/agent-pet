const { spawn } = require('child_process');
const path = require('path');
const os = require('os');

async function start() {
  console.log('🐾 Starting agent-pet...');

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
    console.log('Please ensure pet-desktop is installed');
    return;
  }

  // 检查 node_modules
  const nodeModulesPath = path.join(desktopPath, 'node_modules');
  if (!require('fs').existsSync(nodeModulesPath)) {
    console.log('📦 Installing dependencies...');
    const { execSync } = require('child_process');
    try {
      execSync('npm install', { cwd: desktopPath, stdio: 'inherit' });
    } catch (e) {
      console.error('❌ Failed to install dependencies');
      return;
    }
  }

  // 启动 Electron
  console.log('🚀 Launching desktop pet...');

  const electronPath = path.join(nodeModulesPath, '.bin/electron');
  const mainPath = path.join(desktopPath, 'src/main.js');

  // 移除 ELECTRON_RUN_AS_NODE 环境变量
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;

  if (process.platform === 'win32') {
    // Windows: 直接启动 electron
    const electronExe = path.join(nodeModulesPath, 'electron/dist/electron.exe');
    spawn(electronExe, [mainPath], {
      cwd: desktopPath,
      env,
      detached: true,
      stdio: 'ignore'
    }).unref();
  } else {
    spawn(electronPath, [mainPath], {
      detached: true,
      env,
      cwd: desktopPath,
      stdio: 'ignore'
    }).unref();
  }

  console.log('✅ Desktop pet started in background');

  // 等待一小段时间让进程启动
  await new Promise(r => setTimeout(r, 500));
  process.exit(0);
}

module.exports = { start };