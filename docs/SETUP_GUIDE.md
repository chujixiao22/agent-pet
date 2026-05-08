# claw-pet 开发指南

> **重要提示**：agent-pet CLI 工具独立发布于 [github.com:zunyan/agent-pet](https://github.com/zunyan/agent-pet) 仓库。本仓库（claw-pet）仅包含桌面宠物的源代码。如需安装和使用 agent-pet，请访问该仓库查看 README.md。

claw-pet 是一个为 Claude Code 打造的桌面宠物伴侣应用，可以在桌面上显示可爱的动画宠物，并根据 Claude Code 的工作状态做出反应。本文档面向开发者，介绍如何本地构建和开发 claw-pet。

## 目录

- [快速开始](#快速开始)
- [系统要求](#系统要求)
- [安装步骤](#安装步骤)
- [运行项目](#运行项目)
- [配置说明](#配置说明)
- [常见问题](#常见问题)
- [卸载](#卸载)

---

## 快速开始

> 普通用户请访问 [agent-pet 仓库](https://github.com/zunyan/agent-pet) 获取完整的安装说明。

开发者本地运行：

```bash
# 克隆仓库
git clone https://github.com/zunyan/claw-pet.git
cd claw-pet

# 安装依赖
npm install

# 启动终端服务器
cd packages/terminal-server && npm start

# 启动桌面宠物
cd pets/pet-desktop && npx electron src/main.js
```

---

## 系统要求

| 项目 | 要求 |
|------|------|
| **操作系统** | Windows 10/11 (Linux/macOS 开发支持) |
| **Node.js** | 18.0.0 或更高版本 |
| **包管理器** | npm 或 pnpm |
| **磁盘空间** | 约 500MB（含依赖） |

---

## 安装步骤

### 1. 克隆仓库

```bash
git clone https://github.com/zunyan/claw-pet.git
cd claw-pet
```

### 2. 安装依赖

```bash
npm install
```

这会安装所有组件的依赖：
- `pets/pet-desktop` - Electron 桌面宠物主程序
- `pets/pet-config` - 宠物配置文件
- `packages/terminal-server` - PTY 终端服务器
- `packages/terminal-client` - Vue 终端客户端

---

## 运行项目

### 开发模式

#### 启动终端服务器

```bash
cd packages/terminal-server
npm start
```

服务器将在 `http://localhost:3456` 运行。

#### 启动终端客户端（可选）

```bash
cd packages/terminal-client
npm run dev
```

客户端将在 `http://localhost:3457` 运行。

#### 启动桌面宠物

```bash
cd pets/pet-desktop
npx electron src/main.js
```

### 构建生产版本

```bash
cd pets/pet-desktop
npx electron-builder --win
```

构建完成后，可执行文件位于 `pets/pet-desktop/dist/` 目录。

---

## 配置说明

### Claude Code Hooks 配置

claw-pet 通过 Claude Code 的 Hook 功能实现与 Claude Code 的联动。当 Claude Code 启动时，自动启动桌面宠物。

#### 推荐的 agent-pet 初始化方式

使用 `agent-pet init` 命令会自动完成以下配置（请到 [agent-pet 仓库](https://github.com/zunyan/agent-pet) 获取该工具）：

1. 创建 Hook 脚本：`~/.agent-pet/hooks/pet-hook.js`
2. 更新 Claude Code 设置：`~/.claude/settings.json`

#### 手动配置 Hook

编辑 `~/.claude/settings.json`：

```json
{
  "hooks": {
    "PreToolUse": [{ "matcher": ".*", "hooks": [{ "type": "command", "shell": "powershell", "command": "node \"C:/Users/kezun/.agent-pet/hooks/pet-hook.js\"", "timeout": 5 }] }],
    "PostToolUse": [{ "matcher": ".*", "hooks": [{ "type": "command", "shell": "powershell", "command": "node \"C:/Users/kezun/.agent-pet/hooks/pet-hook.js\"", "timeout": 5 }] }],
    "UserPromptSubmit": [{ "matcher": "", "hooks": [{ "type": "command", "shell": "powershell", "command": "node \"C:/Users/kezun/.agent-pet/hooks/pet-hook.js\"", "timeout": 5 }] }],
    "Stop": [{ "matcher": "", "hooks": [{ "type": "command", "shell": "powershell", "command": "node \"C:/Users/kezun/.agent-pet/hooks/pet-hook.js\"", "timeout": 5 }] }],
    "StopFailure": [{ "matcher": "", "hooks": [{ "type": "command", "shell": "powershell", "command": "node \"C:/Users/kezun/.agent-pet/hooks/pet-hook.js\"", "timeout": 5 }] }],
    "Notification": [{ "matcher": "", "hooks": [{ "type": "command", "shell": "powershell", "command": "node \"C:/Users/kezun/.agent-pet/hooks/pet-hook.js\"", "timeout": 5 }] }],
    "PermissionRequest": [{ "matcher": "", "hooks": [{ "type": "command", "shell": "powershell", "command": "node \"C:/Users/kezun/.agent-pet/hooks/pet-hook.js\"", "timeout": 5 }] }]
  }
}
```

#### Hook 脚本内容

`~/.agent-pet/hooks/pet-hook.js`：

```javascript
const http = require('http');

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
```

此脚本通过 HTTP POST 将 hook 事件发送至终端服务器，失败时静默退出，不影响 Claude Code 正常运行。

### 宠物配置

#### 全局配置目录

```
~/.agent-pet/
├── config.json          # 主配置文件
├── skin-config.json     # 皮肤配置
├── hooks/
│   └── pet-hook.js      # Hook 脚本
└── skins/              # 皮肤目录
    └── default/         # 默认皮肤
```

#### 主配置文件 (`~/.agent-pet/config.json`)

```json
{
  "enabled": true,        // 是否启用宠物
  "autoStart": true,     // 是否自动启动
  "skin": "default"      // 当前皮肤名称
}
```

#### 宠物显示配置 (`pets/pet-config/config.json`)

```json
{
  "name": "Whiskers",     // 宠物名称
  "type": "cat",          // 宠物类型
  "position": "bottom-right",  // 显示位置
  "offsetX": 0,           // X轴偏移
  "offsetY": 0,           // Y轴偏移
  "animationSpeed": "normal"   // 动画速度
}
```

### 皮肤管理

#### 皮肤目录结构

```
skin-name/
├── manifest.json          # 皮肤元数据
├── idle/                  # 待机动画（PNG 帧序列）
├── idle_long/             # 长时间待机动画
├── working/               # 工作动画
├── thinking/              # 思考动画
├── success/               # 成功动画
└── error/                 # 错误动画
```

详细皮肤制作说明请参考 [SKIN_CREATION_GUIDE.md](./SKIN_CREATION_GUIDE.md)。

---

## 常见问题

### Q: 宠物没有显示？

1. 检查宠物是否正在运行：
   ```bash
   # Windows
   tasklist | findstr electron

   # Linux/macOS
   pgrep -f electron
   ```

2. 手动启动宠物：
   ```bash
   cd pets/pet-desktop && npx electron src/main.js
   ```

3. 检查配置是否正确：
   ```bash
   cat ~/.agent-pet/config.json
   ```

### Q: Claude Code 启动时宠物没有自动启动？

1. 检查 Hook 是否配置正确：
   ```bash
   cat ~/.claude/settings.json
   ```

2. 确认 Hook 脚本存在：
   ```bash
   cat ~/.agent-pet/hooks/pet-hook.js
   ```

3. 重新初始化（使用 agent-pet CLI）：
   ```bash
   agent-pet init
   ```

### Q: Hook 报错 "requires bash but Git Bash was not found"？

这是因为 Claude Code 终端使用 PowerShell 环境，而 Hook 配置了 `shell: "bash"`。解决方案：

1. 确保 `~/.claude/settings.json` 中所有 hook 的 `shell` 设置为 `"powershell"`
2. 命令使用绝对路径：`node "C:/Users/你的用户名/.agent-pet/hooks/pet-hook.js"`

### Q: 构建失败？

1. 确保 Node.js 版本符合要求（18+）：
   ```bash
   node --version
   ```

2. 清理并重新安装依赖：
   ```bash
   cd pets/pet-desktop
   rm -rf node_modules package-lock.json
   npm install
   ```

3. 确保 electron-builder 安装正确：
   ```bash
   cd pets/pet-desktop
   npx electron-builder --version
   ```

### Q: 终端服务器连接失败？

1. 确保终端服务器正在运行：
   ```bash
   cd packages/terminal-server
   npm start
   ```

2. 检查端口是否被占用：
   ```bash
   # Windows
   netstat -ano | findstr 3456

   # Linux/macOS
   lsof -i :3456
   ```

### Q: 如何查看日志？

宠物运行日志会输出到控制台。如果需要查看完整日志，可以：

1. 以前端模式运行 Electron：
   ```bash
   cd pets/pet-desktop
   ELECTRON_ENABLE_LOGGING=true npx electron src/main.js
   ```

### Q: 宠物位置异常？

编辑 `pets/pet-config/config.json` 中的 `position`、`offsetX`、`offsetY` 参数调整位置。

---

## 卸载

### 1. 停止宠物

```bash
# Windows - 结束 Electron 进程
taskkill /f /im electron.exe

# Linux/macOS
pkill -f electron
```

### 2. 移除 CLI 工具

```bash
npm uninstall -g agent-pet
```

### 3. 移除配置文件

```bash
# 移除配置目录
rm -rf ~/.agent-pet

# 移除 Claude Code Hooks（需要手动编辑）
# 编辑 ~/.claude/settings.json，移除 hooks 配置
```

### 4. 还原 Claude Code 设置

编辑 `~/.claude/settings.json`，移除 `hooks` 配置项：

```json
{
  // ... 其他配置
  // 删除 "hooks": { ... } 部分
}
```

### 5. 移除项目目录

```bash
rm -rf /path/to/claw-pet
```

---

## 项目结构

```
claw-pet/
├── pets/
│   ├── pet-desktop/       # Electron 桌面宠物主程序
│   ├── pet-config/       # 宠物配置文件
│   └── pet-client/        # 宠物客户端
├── packages/
│   ├── agent-pet/         # CLI 工具源码
│   ├── terminal-client/   # Vue 终端客户端
│   └── terminal-server/   # PTY 终端服务器
├── docs/                  # 文档
│   ├── SETUP_GUIDE.md     # 本指南
│   ├── SKIN_CREATION_GUIDE.md  # 皮肤制作指南
│   └── TECHNICAL_DESIGN.md # 技术设计文档
└── specs/                 # SPEC 开发模式文档
```

---

## 获取帮助

- 查看皮肤制作指南：[SKIN_CREATION_GUIDE.md](./SKIN_CREATION_GUIDE.md)
- 查看技术设计文档：[TECHNICAL_DESIGN.md](./TECHNICAL_DESIGN.md)
- agent-pet CLI 工具：[github.com:zunyan/agent-pet](https://github.com/zunyan/agent-pet)
- 提交 Issue：[GitHub Issues](https://github.com/zunyan/claw-pet/issues)
