const path = require('path');
const fs = require('fs');
const os = require('os');

async function init() {
  console.log('🚀 Initializing agent-pet...');

  // 1. 创建配置目录
  const configDir = path.join(os.homedir(), '.agent-pet');
  const hooksDir = path.join(configDir, 'hooks');

  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  // 2. 创建 pet-hook.js (Node.js 脚本，通过 HTTP 发送事件)
  const petHookPath = path.join(hooksDir, 'pet-hook.js');
  const homedir = os.homedir().replace(/\\/g, '/');

  const petHookContent = `const http = require('http');

let input = '';
process.stdin.setEncoding('utf-8');
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', () => {
  try {
    const req = http.request({
      hostname: 'localhost',
      port: 3456,
      path: '/api/hook',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      timeout: 2000
    }, (res) => { res.resume(); process.exit(0); });
    req.on('error', () => process.exit(0));
    req.on('timeout', () => { req.destroy(); process.exit(0); });
    req.write(input || '{}');
    req.end();
  } catch (e) {
    process.exit(0);
  }
});
`;

  if (!fs.existsSync(hooksDir)) {
    fs.mkdirSync(hooksDir, { recursive: true });
  }
  fs.writeFileSync(petHookPath, petHookContent);
  console.log('✅ Pet hook created at:', petHookPath);

  // 3. 配置 Claude Code 全局 hook
  const settingsPath = path.join(os.homedir(), '.claude', 'settings.json');
  const hookCmd = `node "${homedir}/.agent-pet/hooks/pet-hook.js"`;

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

  // 添加 hooks 配置 (7个钩子)
  settings.hooks = {
    ...settings.hooks,
    PreToolUse: [{ matcher: ".*", hooks: [{ type: "command", shell: "powershell", command: hookCmd, timeout: 5 }] }],
    PostToolUse: [{ matcher: ".*", hooks: [{ type: "command", shell: "powershell", command: hookCmd, timeout: 5 }] }],
    UserPromptSubmit: [{ matcher: "", hooks: [{ type: "command", shell: "powershell", command: hookCmd, timeout: 5 }] }],
    Stop: [{ matcher: "", hooks: [{ type: "command", shell: "powershell", command: hookCmd, timeout: 5 }] }],
    StopFailure: [{ matcher: "", hooks: [{ type: "command", shell: "powershell", command: hookCmd, timeout: 5 }] }],
    Notification: [{ matcher: "", hooks: [{ type: "command", shell: "powershell", command: hookCmd, timeout: 5 }] }],
    PermissionRequest: [{ matcher: "", hooks: [{ type: "command", shell: "powershell", command: hookCmd, timeout: 5 }] }]
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