const { execSync } = require('child_process');

async function stop() {
  console.log('🛑 Stopping agent-pet...');

  if (process.platform === 'win32') {
    try {
      execSync('taskkill /F /IM electron.exe 2>nul', { shell: true, stdio: 'ignore' });
      console.log('✅ Stopped');
    } catch (e) {
      console.log('ℹ️  No running process found');
    }
  } else {
    try {
      execSync('pkill -f electron', { shell: true, stdio: 'ignore' });
      console.log('✅ Stopped');
    } catch (e) {
      console.log('ℹ️  No running process found');
    }
  }

  process.exit(0);
}

module.exports = { stop };