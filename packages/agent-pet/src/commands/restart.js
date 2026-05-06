const { start } = require('./start');

async function restart() {
  console.log('🔄 Restarting agent-pet...');

  // 在 Windows 上尝试终止现有进程
  if (process.platform === 'win32') {
    const { execSync } = require('child_process');
    try {
      execSync('taskkill /F /IM electron.exe 2>nul', { shell: true });
    } catch (e) {
      // 进程可能不存在，忽略
    }
  } else {
    try {
      execSync('pkill -f electron', { shell: true });
    } catch (e) {
      // 进程可能不存在，忽略
    }
  }

  // 等待一下
  await new Promise(r => setTimeout(r, 1000));

  // 重新启动
  await start();
}

module.exports = { restart };