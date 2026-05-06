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

  // 2. 配置 Claude Code 全局 hook
  const settingsPath = path.join(os.homedir(), '.claude', 'settings.json');
  const hooksDir = path.join(os.homedir(), '.claude', 'hooks');
  const petHookPath = path.join(hooksDir, 'pet-hook.sh');

  // 确保目录存在
  if (!fs.existsSync(hooksDir)) {
    fs.mkdirSync(hooksDir, { recursive: true });
  }

  // 创建 pet-hook.sh
  const petHookContent = `#!/bin/bash
# agent-pet global hook
set -euo pipefail

INPUT=$(cat)
HOOK_NAME=$(echo "$INPUT" | jq -r '.hook_name // ""')

AGENT_PET_DIR="$HOME/.agent-pet"

case "$HOOK_NAME" in
  "Start")
    if [ -f "$AGENT_PET_DIR/config.json" ]; then
      ENABLED=$(jq -r '.enabled // true' "$AGENT_PET_DIR/config.json" 2>/dev/null || echo "true")
      if [ "$ENABLED" = "true" ]; then
        # 尝试启动宠物
        if command -v agent-pet &> /dev/null; then
          agent-pet start &
        fi
      fi
    fi
    ;;
esac

# 传递事件
echo "$INPUT"
`;

  fs.writeFileSync(petHookPath, petHookContent);
  fs.chmodSync(petHookPath, '755');
  console.log('✅ Pet hook created at:', petHookPath);

  // 读取或创建 settings.json
  let settings = {};
  if (fs.existsSync(settingsPath)) {
    const content = fs.readFileSync(settingsPath, 'utf8');
    settings = JSON.parse(content);
  }

  // 添加 hooks 配置
  settings.hooks = {
    ...settings.hooks,
    Start: petHookPath,
    Stop: petHookPath
  };

  // 写回 settings.json
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
  console.log('✅ Claude Code settings.json updated at:', settingsPath);

  // 3. 创建配置
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