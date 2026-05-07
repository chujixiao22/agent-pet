const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const http = require('http');

async function setting() {
  const configDir = path.join(os.homedir(), '.agent-pet');
  const settingsHtmlPath = path.join(configDir, 'settings.html');

  // 确保配置目录存在
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  // 读取当前配置
  const configPath = path.join(configDir, 'config.json');
  let currentConfig = {
    enabled: true,
    autoStart: true,
    skin: 'fox-default',
    theme: 'light',
    cardStyle: 'rounded',
    textSize: 'medium',
    animationSpeed: 1.0,
    opacity: 1.0,
    position: 'bottom-right',
    backgroundColor: '#ffffff'
  };

  if (fs.existsSync(configPath)) {
    try {
      currentConfig = { ...currentConfig, ...JSON.parse(fs.readFileSync(configPath, 'utf8')) };
    } catch (e) {}
  }

  // 读取可用皮肤
  const skinsDir = path.join(__dirname, '..', '..', 'skins');
  let availableSkins = ['fox-default'];
  if (fs.existsSync(skinsDir)) {
    availableSkins = fs.readdirSync(skinsDir).filter(d => {
      return fs.statSync(path.join(skinsDir, d)).isDirectory();
    });
  }

  const skinsList = JSON.stringify(availableSkins);

  // 创建 macOS 风格的设置 HTML 页面
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>agent-pet Settings</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    :root {
      --primary: #FF6B9D;
      --primary-light: #FFE4EC;
      --secondary: #7C3AED;
      --accent: #00D4AA;
      --accent2: #FFB347;
      --bg-white: #FFFFFF;
      --bg-gray: #F5F5F7;
      --bg-hover: #E8E8ED;
      --text-primary: #1D1D1F;
      --text-secondary: #86868B;
      --border: #D2D2D7;
      --shadow: rgba(0,0,0,0.08);
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif;
      background: var(--bg-gray);
      color: var(--text-primary);
      height: 100vh;
      display: flex;
      overflow: hidden;
    }

    .sidebar {
      width: 220px;
      background: var(--bg-white);
      border-right: 1px solid var(--border);
      padding: 20px 0;
      display: flex;
      flex-direction: column;
    }

    .sidebar-header {
      padding: 0 20px 20px;
      border-bottom: 1px solid var(--border);
      margin-bottom: 10px;
    }

    .sidebar-header h1 {
      font-size: 18px;
      font-weight: 600;
      background: linear-gradient(135deg, var(--primary), var(--secondary));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .sidebar-header p {
      font-size: 12px;
      color: var(--text-secondary);
      margin-top: 4px;
    }

    .nav-item {
      padding: 10px 20px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 14px;
      color: var(--text-primary);
      transition: all 0.2s;
      border-left: 3px solid transparent;
    }

    .nav-item:hover {
      background: var(--bg-hover);
    }

    .nav-item.active {
      background: var(--primary-light);
      border-left-color: var(--primary);
      color: var(--primary);
      font-weight: 500;
    }

    .nav-item .icon {
      font-size: 18px;
      width: 24px;
      text-align: center;
    }

    .content {
      flex: 1;
      overflow-y: auto;
      padding: 30px 40px;
    }

    .content-section {
      display: none;
    }

    .content-section.active {
      display: block;
    }

    .section-title {
      font-size: 28px;
      font-weight: 600;
      margin-bottom: 8px;
    }

    .section-subtitle {
      font-size: 14px;
      color: var(--text-secondary);
      margin-bottom: 30px;
    }

    .settings-card {
      background: var(--bg-white);
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 20px;
      box-shadow: 0 2px 8px var(--shadow);
    }

    .card-title {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .card-title .icon {
      font-size: 20px;
    }

    .setting-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 14px 0;
      border-bottom: 1px solid var(--bg-gray);
    }

    .setting-row:last-child {
      border-bottom: none;
    }

    .setting-label {
      flex: 1;
    }

    .setting-label span {
      display: block;
      font-size: 14px;
      font-weight: 500;
    }

    .setting-label small {
      display: block;
      font-size: 12px;
      color: var(--text-secondary);
      margin-top: 2px;
    }

    .setting-control {
      min-width: 180px;
      text-align: right;
    }

    select {
      padding: 8px 12px;
      border: 1px solid var(--border);
      border-radius: 8px;
      font-size: 14px;
      background: var(--bg-white);
      cursor: pointer;
      min-width: 140px;
    }

    select:hover {
      border-color: var(--primary);
    }

    .toggle {
      position: relative;
      width: 48px;
      height: 28px;
    }

    .toggle input {
      opacity: 0;
      width: 0;
      height: 0;
    }

    .toggle-slider {
      position: absolute;
      cursor: pointer;
      top: 0; left: 0; right: 0; bottom: 0;
      background: var(--border);
      border-radius: 28px;
      transition: 0.3s;
    }

    .toggle-slider:before {
      position: absolute;
      content: "";
      height: 22px;
      width: 22px;
      left: 3px;
      bottom: 3px;
      background: white;
      border-radius: 50%;
      transition: 0.3s;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }

    .toggle input:checked + .toggle-slider {
      background: var(--primary);
    }

    .toggle input:checked + .toggle-slider:before {
      transform: translateX(20px);
    }

    input[type="range"] {
      -webkit-appearance: none;
      width: 140px;
      height: 6px;
      border-radius: 3px;
      background: var(--bg-gray);
      outline: none;
    }

    input[type="range"]::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: var(--primary);
      cursor: pointer;
      box-shadow: 0 2px 6px rgba(255,107,157,0.4);
    }

    input[type="color"] {
      width: 40px;
      height: 32px;
      border: 1px solid var(--border);
      border-radius: 8px;
      cursor: pointer;
      padding: 2px;
    }

    .save-bar {
      position: fixed;
      bottom: 0;
      left: 220px;
      right: 0;
      padding: 16px 40px;
      background: var(--bg-white);
      border-top: 1px solid var(--border);
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      z-index: 100;
    }

    .btn {
      padding: 10px 24px;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      border: none;
    }

    .btn-secondary {
      background: var(--bg-gray);
      color: var(--text-primary);
    }

    .btn-secondary:hover {
      background: var(--bg-hover);
    }

    .btn-primary {
      background: linear-gradient(135deg, var(--primary), var(--secondary));
      color: white;
    }

    .btn-primary:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(255,107,157,0.4);
    }

    .skin-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
      gap: 12px;
      margin-top: 16px;
    }

    .skin-item {
      padding: 16px;
      border: 2px solid var(--border);
      border-radius: 12px;
      text-align: center;
      cursor: pointer;
      transition: all 0.2s;
    }

    .skin-item:hover {
      border-color: var(--primary);
      background: var(--primary-light);
    }

    .skin-item.active {
      border-color: var(--primary);
      background: var(--primary-light);
    }

    .skin-item .preview {
      font-size: 40px;
      margin-bottom: 8px;
    }

    .skin-item span {
      font-size: 12px;
      color: var(--text-secondary);
    }

    .preview-area {
      display: flex;
      justify-content: center;
      padding: 30px;
      background: var(--bg-gray);
      border-radius: 12px;
      margin-top: 16px;
    }

    .pet-preview {
      width: 120px;
      height: 120px;
      background: var(--bg-white);
      border-radius: var(--card-radius, 16px);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 60px;
      box-shadow: 0 4px 16px var(--shadow);
    }

    .toast {
      position: fixed;
      top: 20px;
      right: 40px;
      background: var(--accent);
      color: white;
      padding: 12px 24px;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 500;
      opacity: 0;
      transform: translateY(-10px);
      transition: all 0.3s;
      z-index: 200;
    }

    .toast.show {
      opacity: 1;
      transform: translateY(0);
    }

    .toast.error {
      background: #FF4757;
    }
  </style>
</head>
<body>
  <div class="sidebar">
    <div class="sidebar-header">
      <h1>agent-pet</h1>
      <p>桌面宠物设置</p>
    </div>
    <div class="nav-item active" data-section="general">
      <span class="icon">⚙️</span>
      <span>通用</span>
    </div>
    <div class="nav-item" data-section="appearance">
      <span class="icon">🎨</span>
      <span>外观</span>
    </div>
    <div class="nav-item" data-section="skin">
      <span class="icon">🐾</span>
      <span>皮肤</span>
    </div>
    <div class="nav-item" data-section="card">
      <span class="icon">🃏</span>
      <span>卡片样式</span>
    </div>
  </div>

  <div class="content">
    <div class="content-section active" id="section-general">
      <h2 class="section-title">通用设置</h2>
      <p class="section-subtitle">控制宠物的基本行为</p>

      <div class="settings-card">
        <div class="card-title"><span class="icon">🚀</span> 启动选项</div>
        <div class="setting-row">
          <div class="setting-label">
            <span>启用宠物</span>
            <small>Claude Code 启动时自动显示宠物</small>
          </div>
          <div class="setting-control">
            <label class="toggle">
              <input type="checkbox" id="enabled" checked>
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>
        <div class="setting-row">
          <div class="setting-label">
            <span>自动启动</span>
            <small>开机时自动运行宠物程序</small>
          </div>
          <div class="setting-control">
            <label class="toggle">
              <input type="checkbox" id="autoStart" checked>
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>
      </div>

      <div class="settings-card">
        <div class="card-title"><span class="icon">🎬</span> 动画设置</div>
        <div class="setting-row">
          <div class="setting-label">
            <span>动画速度</span>
            <small>控制所有动画的播放速度</small>
          </div>
          <div class="setting-control">
            <input type="range" id="animationSpeed" min="0.5" max="2" step="0.1" value="1">
            <span id="speedValue" style="margin-left:10px;font-size:12px;">1.0x</span>
          </div>
        </div>
      </div>
    </div>

    <div class="content-section" id="section-appearance">
      <h2 class="section-title">外观设置</h2>
      <p class="section-subtitle">自定义宠物的外观和行为</p>

      <div class="settings-card">
        <div class="card-title"><span class="icon">🌈</span> 主题</div>
        <div class="setting-row">
          <div class="setting-label">
            <span>配色方案</span>
            <small>选择浅色或深色模式</small>
          </div>
          <div class="setting-control">
            <select id="theme">
              <option value="light">浅色模式</option>
              <option value="dark">深色模式</option>
              <option value="auto">跟随系统</option>
            </select>
          </div>
        </div>
      </div>

      <div class="settings-card">
        <div class="card-title"><span class="icon">💄</span> 透明度与位置</div>
        <div class="setting-row">
          <div class="setting-label">
            <span>透明度</span>
            <small>调整宠物窗口的透明度</small>
          </div>
          <div class="setting-control">
            <input type="range" id="opacity" min="0.3" max="1" step="0.1" value="1">
            <span id="opacityValue" style="margin-left:10px;font-size:12px;">100%</span>
          </div>
        </div>
        <div class="setting-row">
          <div class="setting-label">
            <span>显示位置</span>
            <small>宠物在屏幕上的位置</small>
          </div>
          <div class="setting-control">
            <select id="position">
              <option value="bottom-right">右下角</option>
              <option value="bottom-left">左下角</option>
              <option value="top-right">右上角</option>
              <option value="top-left">左上角</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <div class="content-section" id="section-skin">
      <h2 class="section-title">皮肤设置</h2>
      <p class="section-subtitle">选择你喜欢的小宠物形象</p>

      <div class="settings-card">
        <div class="card-title"><span class="icon">🐾</span> 可用皮肤</div>
        <div class="skin-grid" id="skinGrid"></div>
      </div>

      <div class="settings-card">
        <div class="card-title"><span class="icon">👁️</span> 预览</div>
        <div class="preview-area">
          <div class="pet-preview" id="petPreview">🦊</div>
        </div>
      </div>
    </div>

    <div class="content-section" id="section-card">
      <h2 class="section-title">卡片样式</h2>
      <p class="section-subtitle">自定义卡片的外观效果</p>

      <div class="settings-card">
        <div class="card-title"><span class="icon">📐</span> 形状</div>
        <div class="setting-row">
          <div class="setting-label">
            <span>圆角大小</span>
            <small>卡片边框的圆角弧度</small>
          </div>
          <div class="setting-control">
            <select id="cardStyle">
              <option value="sharp">直角 (0px)</option>
              <option value="small">小圆角 (8px)</option>
              <option value="rounded">圆角 (16px)</option>
              <option value="pill">药丸形 (24px)</option>
            </select>
          </div>
        </div>
        <div class="setting-row">
          <div class="setting-label">
            <span>文字大小</span>
            <small>宠物显示的文字尺寸</small>
          </div>
          <div class="setting-control">
            <select id="textSize">
              <option value="small">小</option>
              <option value="medium">中</option>
              <option value="large">大</option>
            </select>
          </div>
        </div>
      </div>

      <div class="settings-card">
        <div class="card-title"><span class="icon">🎨</span> 背景颜色</div>
        <div class="setting-row">
          <div class="setting-label">
            <span>卡片背景色</span>
            <small>宠物卡片的背景颜色</small>
          </div>
          <div class="setting-control">
            <input type="color" id="backgroundColor" value="#ffffff">
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="save-bar">
    <button class="btn btn-secondary" onclick="window.close()">取消</button>
    <button class="btn btn-primary" onclick="saveSettings()">保存更改</button>
  </div>

  <div class="toast" id="toast"></div>

  <script>
    const currentConfig = ${JSON.stringify(currentConfig)};
    const availableSkins = ${skinsList};
    const configPath = '${configPath.replace(/\\/g, '\\\\')}';

    const skinIcons = {
      'fox-default': '🦊',
      'cat-cute': '🐱',
      'bunny-pink': '🐰',
      'default': '🦊'
    };

    function init() {
      document.getElementById('enabled').checked = currentConfig.enabled !== false;
      document.getElementById('autoStart').checked = currentConfig.autoStart !== false;
      document.getElementById('theme').value = currentConfig.theme || 'light';
      document.getElementById('cardStyle').value = currentConfig.cardStyle || 'rounded';
      document.getElementById('textSize').value = currentConfig.textSize || 'medium';
      document.getElementById('animationSpeed').value = currentConfig.animationSpeed || 1.0;
      document.getElementById('opacity').value = currentConfig.opacity || 1.0;
      document.getElementById('position').value = currentConfig.position || 'bottom-right';
      document.getElementById('backgroundColor').value = currentConfig.backgroundColor || '#ffffff';

      updateSpeedValue();
      updateOpacityValue();
      renderSkinGrid();
      updatePreview();

      document.getElementById('animationSpeed').addEventListener('input', updateSpeedValue);
      document.getElementById('opacity').addEventListener('input', updateOpacityValue);

      document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => switchSection(item.dataset.section));
      });
    }

    function switchSection(section) {
      document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.section === section);
      });
      document.querySelectorAll('.content-section').forEach(sec => {
        sec.classList.toggle('active', sec.id === 'section-' + section);
      });
    }

    function updateSpeedValue() {
      document.getElementById('speedValue').textContent = document.getElementById('animationSpeed').value + 'x';
    }

    function updateOpacityValue() {
      document.getElementById('opacityValue').textContent = Math.round(document.getElementById('opacity').value * 100) + '%';
    }

    function renderSkinGrid() {
      const grid = document.getElementById('skinGrid');
      grid.innerHTML = '';
      availableSkins.forEach(skin => {
        const icon = skinIcons[skin] || '🐾';
        const item = document.createElement('div');
        item.className = 'skin-item' + (skin === currentConfig.skin ? ' active' : '');
        item.dataset.skin = skin;
        item.innerHTML = '<div class="preview">' + icon + '</div><span>' + skin + '</span>';
        item.addEventListener('click', () => selectSkin(skin));
        grid.appendChild(item);
      });
    }

    function selectSkin(skin) {
      currentConfig.skin = skin;
      document.querySelectorAll('.skin-item').forEach(item => {
        item.classList.toggle('active', item.dataset.skin === skin);
      });
      updatePreview();
    }

    function updatePreview() {
      const preview = document.getElementById('petPreview');
      preview.textContent = skinIcons[currentConfig.skin] || '🐾';
      const cardRadius = {'sharp': '0px', 'small': '8px', 'rounded': '16px', 'pill': '24px'};
      preview.style.borderRadius = cardRadius[currentConfig.cardStyle] || '16px';
      preview.style.backgroundColor = currentConfig.backgroundColor || '#ffffff';
    }

    async function saveSettings() {
      const config = {
        enabled: document.getElementById('enabled').checked,
        autoStart: document.getElementById('autoStart').checked,
        theme: document.getElementById('theme').value,
        skin: currentConfig.skin,
        cardStyle: document.getElementById('cardStyle').value,
        textSize: document.getElementById('textSize').value,
        animationSpeed: parseFloat(document.getElementById('animationSpeed').value),
        opacity: parseFloat(document.getElementById('opacity').value),
        position: document.getElementById('position').value,
        backgroundColor: document.getElementById('backgroundColor').value
      };

      try {
        const res = await fetch('http://localhost:3456/save', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({path: configPath, config})
        });
        if (res.ok) {
          showToast('设置已保存！重启宠物生效', false);
        } else {
          throw new Error('Save failed');
        }
      } catch (e) {
        showToast('保存失败，请重试', true);
      }
    }

    function showToast(msg, isError) {
      const toast = document.getElementById('toast');
      toast.textContent = msg;
      toast.className = 'toast' + (isError ? ' error' : '') + ' show';
      setTimeout(() => toast.classList.remove('show'), 3000);
    }

    init();
  </script>
</body>
</html>`;

  // 写入 HTML 文件
  fs.writeFileSync(settingsHtmlPath, html);

  // 创建简单的 HTTP 服务器来提供设置页面和保存配置
  const server = http.createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/') {
      res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
      res.end(html);
    } else if (req.method === 'POST' && req.url === '/save') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const {path: filePath, config} = JSON.parse(body);
          fs.writeFileSync(filePath, JSON.stringify(config, null, 2));
          res.writeHead(200, {'Content-Type': 'application/json'});
          res.end(JSON.stringify({success: true}));

          // Also update claw-pet skin-config if this is agent-pet config
          if (filePath.includes('.agent-pet')) {
            const clawPetPath = path.join(os.homedir(), '.claw-pet', 'skin-config.json');
            const clawPetConfig = {
              skin: config.skin,
              theme: config.theme
            };
            try {
              const clawPetDir = path.join(os.homedir(), '.claw-pet');
              if (!fs.existsSync(clawPetDir)) {
                fs.mkdirSync(clawPetDir, { recursive: true });
              }
              fs.writeFileSync(clawPetPath, JSON.stringify(clawPetConfig, null, 2));
            } catch (e) {
              console.error('Failed to update claw-pet config:', e);
            }
          }
        } catch (e) {
          res.writeHead(500, {'Content-Type': 'application/json'});
          res.end(JSON.stringify({error: e.message}));
        }
      });
    } else if (req.method === 'GET' && req.url === '/close') {
      server.close();
      res.writeHead(200);
      res.end();
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  server.listen(3456, () => {
    // 打开浏览器
    if (process.platform === 'win32') {
      spawn('cmd', ['/c', 'start', 'http://localhost:3456'], { detached: true, stdio: 'ignore' });
    } else if (process.platform === 'darwin') {
      spawn('open', ['http://localhost:3456'], { detached: true, stdio: 'ignore' });
    } else {
      spawn('xdg-open', ['http://localhost:3456'], { detached: true, stdio: 'ignore' });
    }

    console.log('🌐 Settings page opened at http://localhost:3456');
  });

  // 窗口关闭后清理服务器
  setTimeout(() => {
    fetch('http://localhost:3456/close').finally(() => {
      server.close();
    });
  }, 60000); // 1分钟后自动关闭
}

module.exports = { setting };
