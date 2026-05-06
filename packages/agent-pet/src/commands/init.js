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
  const claudeDir = path.join(os.homedir(), '.claude');
  const hooksDir = path.join(claudeDir, 'hooks');

  if (!fs.existsSync(hooksDir)) {
    fs.mkdirSync(hooksDir, { recursive: true });
  }

  // 创建 hook 脚本
  const hookContent = `#!/bin/bash
# agent-pet hook - 在 Claude Code 运行时启动宠物

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PET_SCRIPT="$SCRIPT_DIR/pet-hook.sh"

# 如果存在 pet hook 脚本，则执行
if [ -f "$PET_SCRIPT" ]; then
  bash "$PET_SCRIPT" &
fi
`;

  // 检查是否已经有 hook
  const existingHook = path.join(hooksDir, 'preamble.sh');
  if (fs.existsSync(existingHook)) {
    const content = fs.readFileSync(existingHook, 'utf8');
    if (content.includes('agent-pet')) {
      console.log('✅ Hook already configured');
      return;
    }
  }

  // 写入 hook
  fs.writeFileSync(existingHook, hookContent);
  console.log('✅ Global hook configured at:', existingHook);

  // 3. 创建 pet-hook.sh
  const petHookPath = path.join(hooksDir, 'pet-hook.sh');
  const petHookContent = `#!/bin/bash
# agent-pet pet hook

# 检查是否应该启动宠物
if [ "$AGENT_PET_ENABLED" != "false" ]; then
  # macOS: 使用 open 启动
  if [[ "$OSTYPE" == "darwin"* ]]; then
    # 尝试查找并启动 agent-pet
    if command -v agent-pet &> /dev/null; then
      agent-pet start &
    fi
  fi
fi
`;

  fs.writeFileSync(petHookPath, petHookContent);
  fs.chmodSync(petHookPath, '755');
  console.log('✅ Pet hook created at:', petHookPath);

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
}

module.exports = { init };