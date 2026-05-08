const path = require('path');
const fs = require('fs');
const os = require('os');

async function init() {
  console.log('🚀 Initializing agent-pet...');

  // 1. 创建配置目录
  const configDir = path.join(os.homedir(), '.agent-pet');

  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  // 2. 配置 Claude Code 全局 hook (直接使用 HTTP 类型)
  const settingsPath = path.join(os.homedir(), '.claude', 'settings.json');

  // 读取或创建 settings.json
  let settings = {};
  if (fs.existsSync(settingsPath)) {
    try {
      const content = fs.readFileSync(settingsPath, 'utf8');
      settings = JSON.parse(content);
    } catch (e) {
      settings = {};
    }
  }

  // 添加 hooks 配置 (7个钩子，直接使用 HTTP)
  settings.hooks = {
    ...settings.hooks,
    PreToolUse: [{ matcher: ".*", hooks: [{ type: "http", url: "http://localhost:3456/api/hook", timeout: 5 }] }],
    PostToolUse: [{ matcher: ".*", hooks: [{ type: "http", url: "http://localhost:3456/api/hook", timeout: 5 }] }],
    UserPromptSubmit: [{ matcher: "", hooks: [{ type: "http", url: "http://localhost:3456/api/hook", timeout: 5 }] }],
    Stop: [{ matcher: "", hooks: [{ type: "http", url: "http://localhost:3456/api/hook", timeout: 5 }] }],
    StopFailure: [{ matcher: "", hooks: [{ type: "http", url: "http://localhost:3456/api/hook", timeout: 5 }] }],
    Notification: [{ matcher: "", hooks: [{ type: "http", url: "http://localhost:3456/api/hook", timeout: 5 }] }],
    PermissionRequest: [{ matcher: "", hooks: [{ type: "http", url: "http://localhost:3456/api/hook", timeout: 5 }] }]
  };

  // 写回 settings.json
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
  console.log('✅ Claude Code settings.json updated at:', settingsPath);

  // 4. 创建配置
  const config = {
    enabled: true,
    autoStart: true,
    skin: 'default'
  };

  fs.writeFileSync(
    path.join(configDir, 'config.json'),
    JSON.stringify(config, null, 2)
  );
  console.log('✅ Configuration saved to:', configDir);

  console.log('');
  console.log('✨ agent-pet initialized successfully!');
  console.log('');
  console.log('Next steps:');
  console.log('  agent-pet start  - Start the pet');
  console.log('  Restart Claude Code to apply hooks');
}

module.exports = { init };