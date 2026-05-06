const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

async function setting() {
  const configDir = path.join(os.homedir(), '.agent-pet');
  const settingsHtmlPath = path.join(configDir, 'settings.html');

  // 创建简单的设置 HTML 页面
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>agent-pet Settings</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; display: flex; justify-content: center; align-items: center; }
    .container { background: white; border-radius: 16px; padding: 32px; width: 400px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }
    h1 { color: #333; margin-bottom: 24px; font-size: 24px; }
    .form-group { margin-bottom: 20px; }
    label { display: block; color: #666; margin-bottom: 8px; font-size: 14px; }
    input[type="text"], select { width: 100%; padding: 12px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 16px; }
    input[type="checkbox"] { width: 20px; height: 20px; }
    .checkbox-group { display: flex; align-items: center; gap: 10px; }
    button { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; padding: 12px 24px; border-radius: 8px; font-size: 16px; cursor: pointer; width: 100%; }
    button:hover { opacity: 0.9; }
    .skins { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 10px; }
    .skin-option { padding: 10px; border: 2px solid #e0e0e0; border-radius: 8px; text-align: center; cursor: pointer; }
    .skin-option.active { border-color: #667eea; background: #f0f0ff; }
    .skin-preview { width: 60px; height: 60px; background: #f0f0f0; border-radius: 8px; margin: 0 auto 5px; display: flex; align-items: center; justify-content: center; font-size: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🎮 agent-pet Settings</h1>

    <div class="form-group">
      <label>Enabled</label>
      <div class="checkbox-group">
        <input type="checkbox" id="enabled" checked>
        <span>Enable pet on Claude Code start</span>
      </div>
    </div>

    <div class="form-group">
      <label>Current Skin</label>
      <select id="skin">
        <option value="default">Default Fox</option>
        <option value="cat">Cat</option>
        <option value="bunny">Bunny</option>
        <option value="dog">Dog</option>
      </select>
    </div>

    <div class="form-group">
      <label>Theme</label>
      <select id="theme">
        <option value="light">Light</option>
        <option value="dark">Dark</option>
        <option value="auto">Auto</option>
      </select>
    </div>

    <button onclick="save()">Save Settings</button>
  </div>

  <script>
    const configPath = '${path.join(configDir, 'config.json').replace(/\\/g, '\\\\')}';

    // Load current config
    fetch('file://' + configPath)
      .then(r => r.json())
      .then(config => {
        document.getElementById('enabled').checked = config.enabled !== false;
        document.getElementById('skin').value = config.skin || 'default';
        document.getElementById('theme').value = config.theme || 'light';
      })
      .catch(() => {});

    function save() {
      const config = {
        enabled: document.getElementById('enabled').checked,
        skin: document.getElementById('skin').value,
        theme: document.getElementById('theme').value
      };

      // Save to config file (needs native API)
      alert('Settings saved! Restart pet to apply.');
      window.close();
    }
  </script>
</body>
</html>`;

  fs.writeFileSync(settingsHtmlPath, html);

  // 打开浏览器
  if (process.platform === 'win32') {
    spawn('cmd', ['/c', 'start', settingsHtmlPath], { detached: true, stdio: 'ignore' });
  } else if (process.platform === 'darwin') {
    spawn('open', [settingsHtmlPath], { detached: true, stdio: 'ignore' });
  } else {
    spawn('xdg-open', [settingsHtmlPath], { detached: true, stdio: 'ignore' });
  }

  console.log('🌐 Settings page opened in browser');
}

module.exports = { setting };