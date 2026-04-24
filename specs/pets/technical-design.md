# Claude Code 电子宠物 - 技术设计文档

## 1. 架构概述

```
┌─────────────────────────────────────────────────────────┐
│                    Claude Code                           │
│  ┌─────────┐                                             │
│  │ /pets   │ ────── Skill Trigger ──────►               │
│  └─────────┘                                             │
└─────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│              Electron Pet Client                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │                  Main Process                    │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────┐ │    │
│  │  │ IPC Server  │  │StatusMonitor│  │  Config │ │    │
│  │  └──────┬──────┘  └──────┬──────┘  └────┬────┘ │    │
│  └─────────┼────────────────┼───────────────┼──────┘    │
│            │                │               │            │
│  ┌─────────┴────────────────┴───────────────┴──────┐    │
│  │                 Renderer Process                  │    │
│  │  ┌─────────────────────────────────────────────┐ │    │
│  │  │              Pet Canvas (HTML/CSS)          │ │    │
│  │  │  - Animated Sprite                          │ │    │
│  │  │  - State Machine                            │ │    │
│  │  │  - Particle Effects                         │ │    │
│  │  └─────────────────────────────────────────────┘ │    │
│  └──────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

---

## 2. 模块设计

### 2.1 Skill 模块 (pets/skill/pets.ts)

**职责**：Claude Code Skill 入口，响应 `/pets` 命令

**接口设计**：
```typescript
interface SkillHandlers {
  pets: (args: string[]) => Promise<void>;
}
```

**命令处理**：
| 命令 | 处理逻辑 |
|-----|---------|
| `/pets` | 启动宠物客户端（如果未运行），显示宠物 |
| `/pets help` | 输出帮助信息 |
| `/pets config` | 打开配置文件 |
| `/pets hide` | 隐藏宠物窗口 |
| `/pets show` | 显示宠物窗口 |

**通信机制**：
- 使用 Node.js child_process 启动 Electron 客户端
- 通过 IPC (Inter-Process Communication) 与客户端通信

### 2.2 Pet Client 模块 (pets/pet-client/)

**技术栈**：
- Electron (latest stable)
- HTML5 Canvas / CSS Animation
- TypeScript

**窗口配置**：
```typescript
const mainWindow = new BrowserWindow({
  width: 200,
  height: 200,
  frame: false,           // 无边框
  transparent: true,       // 透明背景
  alwaysOnTop: true,       // 始终置顶
  resizable: false,        // 不可调整大小
  skipTaskbar: true,       // 不显示在任务栏
  webPreferences: {
    nodeIntegration: false,
    contextIsolation: true
  }
});
```

**窗口位置**：默认右下角，`position: fixed; right: 20px; bottom: 20px;`

### 2.3 Status Monitor 模块 (pets/status-monitor/monitor.ts)

**职责**：监听 Claude Code 状态变化，通过 IPC 通知渲染进程

**监听内容**：
| 状态 | 检测方式 |
|-----|---------|
| Claude Code 启动/退出 | 进程列表轮询 |
| 当前任务状态 | hook 机制或轮询 |
| Git 状态变化 | 文件系统监听 |

**IPC 消息格式**：
```typescript
interface StatusMessage {
  type: 'status_change' | 'git_change' | 'process_change';
  payload: {
    status: 'idle' | 'working' | 'thinking' | 'success' | 'error';
    project?: string;
    timestamp: number;
  };
}
```

### 2.4 配置模块 (pets/pet-config/config.json)

**配置文件格式**：
```json
{
  "name": "Whiskers",
  "type": "cat",
  "position": "bottom-right",
  "offsetX": 0,
  "offsetY": 0,
  "animationSpeed": "normal"
}
```

**配置验证**：
- 使用 JSON Schema 验证
- 提供默认值 fallback

---

## 3. 宠物动画状态机

### 3.1 状态定义

```
                    ┌─────────┐
                    │  START  │
                    └────┬────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────┐
│                      IDLE                            │
│  (眨眼、晃耳朵) ◄──────────────────────────────┐     │
└──────────────────┬─────────────────────────────┘     │
                   │                                      │
         ┌─────────┴─────────┐                           │
         ▼                   ▼                           │
┌─────────────────┐  ┌─────────────────┐                │
│    WORKING      │  │    THINKING     │                │
│ (敲击键盘、滚动) │  │   (沉思、挠头)   │                │
└────────┬────────┘  └────────┬────────┘                │
         │                    │                           │
         └─────────┬──────────┘                           │
                   │                                      │
                   ▼                                       │
         ┌─────────────────┐                              │
         │    SUCCESS      │──────────────────────────────┘
         │   (欢呼、跳跃)   │   (自动回归 Idle)
         └─────────────────┘
                   │
                   ▼
         ┌─────────────────┐
         │     ERROR       │
         │   (沮丧、哭泣)   │──────────────────────────────┘
         └─────────────────┘   (自动回归 Idle)
```

### 3.2 状态转换规则

| 当前状态 | 触发条件 | 目标状态 | 持续时间 |
|---------|---------|---------|---------|
| START | 客户端启动 | IDLE | - |
| IDLE | 检测到 Claude Code 开始任务 | WORKING | 直到任务结束 |
| IDLE | 检测到 AI 开始思考 | THINKING | 直到思考结束 |
| WORKING | 任务成功完成 | SUCCESS | 2秒后回归 IDLE |
| WORKING | 任务执行出错 | ERROR | 3秒后回归 IDLE |
| THINKING | 思考完成 | WORKING | - |
| SUCCESS | 动画完成 | IDLE | 自动 |
| ERROR | 动画完成 | IDLE | 自动 |
| IDLE | 空闲超过5分钟 | IDLE_LONG | - |

### 3.3 动画实现

**帧动画设计**：
- 每个状态 3-5 帧精灵图
- 使用 CSS sprite animation 或 Canvas 绘制
- 目标帧率：30fps

**动画文件结构**：
```
assets/
├── cat/
│   ├── idle/       # idle_1.png, idle_2.png, idle_3.png
│   ├── working/    # work_1.png, work_2.png, work_3.png
│   ├── thinking/   # think_1.png, think_2.png, think_3.png
│   ├── success/    # success_1.png, success_2.png, success_3.png
│   └── error/      # error_1.png, error_2.png, error_3.png
├── dog/
│   └── ...
```

---

## 4. IPC 通信方案

### 4.1 Main ↔ Renderer 通信

**Main Process**：
```typescript
// main.ts
import { ipcMain } from 'electron';

ipcMain.handle('get-status', () => {
  return currentStatus;
});

ipcMain.on('set-position', (event, position) => {
  // 更新窗口位置
});
```

**Renderer Process**：
```typescript
// preload.ts
contextBridge.exposeInMainWorld('electronAPI', {
  onStatusChange: (callback) => ipcRenderer.on('status-change', callback),
  getConfig: () => ipcRenderer.invoke('get-config')
});
```

### 4.2 状态推送机制

```typescript
// Main Process 状态推送
statusMonitor.on('statusChange', (newStatus) => {
  mainWindow.webContents.send('status-change', newStatus);
});
```

---

## 5. 技能触发机制

### 5.1 Skill 注册

```typescript
// pets.ts
export async function pets(args: string[]) {
  const subcommand = args[0];

  switch (subcommand) {
    case undefined:
      await launchPetClient();
      break;
    case 'help':
      await showHelp();
      break;
    case 'config':
      await openConfig();
      break;
    case 'hide':
      await hidePet();
      break;
    case 'show':
      await showPet();
      break;
    default:
      console.log('Unknown command');
  }
}
```

### 5.2 客户端启动

```typescript
async function launchPetClient() {
  const clientPath = path.join(__dirname, '../pet-client');

  // 检查进程是否已运行
  const isRunning = await checkPetProcess();
  if (!isRunning) {
    child_process.spawn('electron', [clientPath], {
      detached: true,
      stdio: 'ignore'
    });
  }

  // 发送显示命令
  await sendToPet('show');
}
```

---

## 6. 项目隔离机制

### 6.1 目录检测

```typescript
function getCurrentProject(): string | null {
  const cwd = process.cwd();

  // 检查是否是 Git 仓库
  const gitDir = path.join(cwd, '.git');
  if (!fs.existsSync(gitDir)) {
    return null;
  }

  return cwd;
}
```

### 6.2 Git 状态监听

```typescript
function watchGitStatus(projectPath: string) {
  const gitDir = path.join(projectPath, '.git');

  // 监听 .git 目录变化
  fs.watch(gitDir, { recursive: true }, (eventType, filename) => {
    if (filename.includes('HEAD') || filename.includes('index')) {
      notifyStatusChange('git_change');
    }
  });
}
```

---

## 7. 目录结构

```
f:/codes/claw-pet/
├── specs/
│   └── pets/
│       ├── requirements.md      # 需求文档
│       └── technical-design.md  # 技术设计文档
├── pets/
│   ├── skill/                   # Claude Code skill
│   │   └── pets.ts              # Skill 入口
│   ├── pet-client/              # Electron 客户端
│   │   ├── src/
│   │   │   ├── main.ts          # 主进程
│   │   │   ├── preload.ts       # 预加载脚本
│   │   │   ├── renderer.ts      # 渲染进程
│   │   │   ├── pet.ts           # 宠物类
│   │   │   ├── stateMachine.ts  # 状态机
│   │   │   └── assets/          # 动画资源
│   │   ├── index.html           # 主页面
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── pet-config/              # 配置文件
│   │   └── config.json
│   └── status-monitor/          # 状态监听器
│       ├── monitor.ts
│       └── gitWatcher.ts
└── README.md
```

---

## 8. 关键技术决策

| 决策点 | 选择 | 理由 |
|-------|------|------|
| UI 框架 | 原生 Canvas + CSS | 轻量级，适合简单动画 |
| 状态管理 | 有限状态机 | 明确的状态转换，易于维护 |
| 进程通信 | Electron IPC | 原生支持，稳定可靠 |
| 配置存储 | JSON 文件 | 简单直接，用户易修改 |
| 动画方案 | Sprite Sheet | 跨平台兼容性好，文件体积小 |

---

## 9. 后续扩展方向

- 更多宠物类型（狗、鸟、兔子等）
- 宠物自定义（颜色、配件）
- 宠物喂食/互动游戏
- 状态通知气泡
- 多宠物同时显示