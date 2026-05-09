# 审批提醒 技术设计文档

> 任务代号：approval-alert
> 文档类型：技术设计文档（Technical Design）
> 适用项目：agent-pet（Claude Code 桌面陪伴宠物）
> 关联模块：pet-desktop（Electron 主进程 + 渲染进程）
> 关联需求：[requirements.md](./requirements.md)

---

## 1. 设计目标

在不改 terminal-server、不动皮肤包、不升级数据通道的前提下，仅修改 pet-desktop 的主进程与渲染进程，让"任务进入 `waiting` 状态"这一信号通过 **OS 级提醒（系统通知 / 任务栏闪烁 / Dock 徽章）+ 宠物画面 CSS 覆盖层** 同时推达用户。

---

## 2. 现有架构关键点回顾

为后续 reviewer 快速理解改造点，先简要列出本次涉及的现有机制：

### 2.1 数据链路

```
Claude Code hook
   ↓ POST /api/hook
terminal-server（packages/terminal-server/src/index.js）
   ↓ 内存 Map：hookTasks
GET /api/hooks  ←—— pet-desktop 主进程每 1s 轮询
   ↓ IPC: tasks-update / sessions-update
pet-desktop 渲染进程（renderer.js）
```

- 1 秒轮询入口：[main.js#L202-L210](../../pets/pet-desktop/src/main.js#L202)
- `refreshAll()` 同时拉 `/api/hooks` 与 `/api/sessions` 并合并：[main.js#L212-L279](../../pets/pet-desktop/src/main.js#L212)
- 注意：`filteredTasks` 已剔除掉「在 sessions 里也存在」的 hook task（[main.js#L241-L242](../../pets/pet-desktop/src/main.js#L241)），但 `waiting` 信号源始终是 **原始 hookTasks**，不会被过滤掉。本设计用 **未过滤的 `hookTasks`** 作为协调器输入，避免漏判。

### 2.2 任务 payload 字段（来自 terminal-server，本 PR 不变）

| 字段 | 含义 | 备注 |
|------|------|------|
| `id` | sessionId | 同时是 hookTasks 的 key |
| `cwd` | 项目工作目录 | 用于提取项目名（末段目录） |
| `status` | `working` / `waiting` / `completed` / `interrupted` | 状态字段 |
| `lastActivity` | ISO 时间戳 | 最近一次 hook 事件时间 |
| `lastTool` | 工具名 | 例如 `Bash` / `Edit` |
| `lastToolSummary` | 工具简述 | 已截断，用于副标题展示 |
| `waitingMessage` | 通知消息原文 | 仅 `waiting` 时有，已被 server 限制 ≤ 80 字符（[index.js#L148](../../packages/terminal-server/src/index.js#L148)） |

### 2.3 状态机现状

`renderer.js` 的 `Pet` 类只有 6 个状态：`idle / idle_long / working / thinking / success / error`。`updateTasks()` 把 `status === 'working' || status === 'waiting'` 合并为同一个 `activeTasks` 集合（[renderer.js#L271](../../pets/pet-desktop/src/renderer.js#L271)），是 waiting 信号在 UI 层被吞掉的根因。

**本设计明确不新增状态机状态**，working 动画继续保留作为 waiting 期间的底层动画，覆盖层独立叠加。这样：
- 不需要新增帧资源；
- 与所有现有皮肤兼容；
- 撤销变更不影响 waiting 之外的任何分支。

---

## 3. 改造范围

| 文件 | 改动类型 | 改动简述 | 预估行数 |
|------|---------|----------|---------|
| `pets/pet-desktop/src/main.js` | 修改 | 新增内联的"审批提醒协调器"模块；在 `refreshAll()` 末尾消费 hookTasks；新增 `Notification` / `flashFrame` / `setBadgeCount` 调用；补 `setAppUserModelId`；监听 `mainWindow.focus` | ~80 |
| `pets/pet-desktop/src/renderer.js` | 修改 | 在 `updateTasks` 中计算 `hasWaiting` 并切换 body / 容器 class | ~10 |
| `pets/pet-desktop/src/index.html` | 修改 | 新增 `.awaiting-approval-overlay` 与脉冲 keyframes 样式；在 `#pet-container` 内追加覆盖层 DOM | ~40 |
| `pets/pet-desktop/src/preload.js` | 不改 | 现有 IPC 已够用，无需新增 channel | 0 |

**总计约 130 行净增**（含注释与空行；纯代码逻辑约 90 行）。

---

## 4. 详细设计

### 4.1 主进程（main.js）—— 审批提醒协调器

#### 4.1.1 设计选择

把所有提醒触发逻辑放在主进程的理由：
1. `Notification` / `flashFrame` / `setBadgeCount` 都是 Electron **主进程独占** 的 API；
2. 状态边沿检测（前后两轮 status 比对）需要持有跨轮询的内存状态，主进程是天然宿主；
3. 渲染进程只负责"画"覆盖层，主渲染分离，关注点清晰。

#### 4.1.2 数据结构

在 `main.js` 顶层（紧邻 `let wsMap = {};` 处）新增：

```js
// approval-alert: 跟踪"上一轮已通知过"的 session
//   key   = sessionId
//   value = { notifiedAt: number, lastStatus: string, cwd: string }
const notifiedSessions = new Map();
```

设计要点：
- **不持久化**。重启后丢失，最多导致重启瞬间多发一次通知，AC-6 已接受该行为。
- 用 `Map` 而非 `Set` 是为了后续若要做"通知去抖时间戳"等扩展时不必再改结构。
- 单进程，无并发风险。

#### 4.1.3 关键函数

伪代码 + 真实 API，可以照着实现：

```js
// 在文件顶部 require 处加入 Notification
const { app, BrowserWindow, Menu, ipcMain, screen, dialog, Notification } = require('electron');

// ---------- approval-alert: 协调器 ----------

function extractProjectName(cwd) {
  if (!cwd) return 'unknown';
  const parts = String(cwd).replace(/\\/g, '/').split('/').filter(Boolean);
  return parts[parts.length - 1] || 'unknown';
}

function showApprovalNotification(task) {
  if (!Notification.isSupported()) {
    console.log('[approval-alert] Notification API unavailable, fallback to overlay+flash only');
    return;
  }
  const project = extractProjectName(task.cwd);
  const detail = (task.waitingMessage || task.lastToolSummary || '').slice(0, 120);
  const body = detail
    ? `Project: ${project}\n${detail}`
    : `Project: ${project}\nA task is waiting for your approval`;

  const n = new Notification({
    title: 'Claude Code is waiting for approval',
    body,
    silent: false
  });
  n.on('click', () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  });
  n.show();
  console.log(`[approval-alert] notify session=${task.id} cwd=${task.cwd}`);
}

function reconcileApprovalAlerts(hookTasks) {
  if (!mainWindow || mainWindow.isDestroyed()) return;

  // 1. 当前 waiting 任务集合
  const currentWaiting = new Map();
  for (const t of hookTasks) {
    if (t && t.status === 'waiting' && t.id) {
      currentWaiting.set(t.id, t);
    }
  }

  // 2. 边沿检测：新进入 waiting → notify
  for (const [id, task] of currentWaiting) {
    const prev = notifiedSessions.get(id);
    if (!prev || prev.lastStatus !== 'waiting') {
      showApprovalNotification(task);
      notifiedSessions.set(id, {
        notifiedAt: Date.now(),
        lastStatus: 'waiting',
        cwd: task.cwd || ''
      });
    }
  }

  // 3. 边沿检测：退出 waiting → 清理
  for (const id of [...notifiedSessions.keys()]) {
    if (!currentWaiting.has(id)) {
      notifiedSessions.delete(id);
    }
  }

  // 4. flashFrame：有 waiting 且窗口失焦 → 开；否则按 focus 事件由 OS 自动停
  const hasWaiting = currentWaiting.size > 0;
  if (hasWaiting && !mainWindow.isFocused()) {
    mainWindow.flashFrame(true);
    console.log('[approval-alert] flashFrame on');
  } else if (!hasWaiting) {
    mainWindow.flashFrame(false);
  }

  // 5. Dock badge（macOS）；其他平台 setBadgeCount 静默忽略，不抛异常
  try {
    if (process.platform === 'darwin') {
      app.setBadgeCount(hasWaiting ? currentWaiting.size : 0);
      console.log(`[approval-alert] badge=${hasWaiting ? currentWaiting.size : 0}`);
    }
  } catch (e) {
    console.log(`[approval-alert] setBadgeCount skipped: ${e.message}`);
  }
}
```

#### 4.1.4 接入点

在 `refreshAll()` 内、`mainWindow.webContents.send('sessions-update', mapped)` 之后、`Resize window` 之前插入：

```js
// approval-alert: 在每轮拿到 hookTasks 后做边沿检测
reconcileApprovalAlerts(hookTasks);
```

放在 `sessions-update` 之后是为了避免在协调器抛错（理论上不会，但兜底）时影响渲染进程的正常 UI 更新。

#### 4.1.5 窗口生命周期挂钩

在 `createWindow()` 末尾、`mainWindow.on('closed', ...)` 之前增加：

```js
// approval-alert: 窗口被聚焦 → 主动停闪
mainWindow.on('focus', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.flashFrame(false);
  }
});
```

`flashFrame(false)` 在没有闪烁时调用是 no-op，安全。

#### 4.1.6 Windows 通知前置条件

Windows 上 `new Notification()` 要正常显示通知中心条目需要 `app.setAppUserModelId('<your-id>')`，否则部分系统下通知会显示"electron.app.<name>"或者直接被吞。

在 `app.whenReady().then(() => {...})` 块开头、`createWindow()` 之前加：

```js
// approval-alert: Windows 系统通知需要 AUMID 才能稳定显示
if (process.platform === 'win32') {
  app.setAppUserModelId('com.agentpet.desktop');
}
```

> AUMID 选用 reverse-DNS 风格，`com.agentpet.desktop`，与项目命名一致。如需后续做安装包，要同步到 NSIS / squirrel 配置里，本 PR 范围外。

---

### 4.2 渲染进程（renderer.js）

只做一件事：把"是否有 waiting 任务"反映到 `<body>` 的 class 上，由 CSS 决定覆盖层显隐。**不动状态机分支**。

在 `updateTasks(tasks)` 方法**第一行**插入：

```js
updateTasks(tasks) {
  // approval-alert: 计算"是否存在 waiting 任务"，驱动 CSS 覆盖层
  const hasWaiting = Array.isArray(tasks) && tasks.some(t => t && t.status === 'waiting');
  document.body.classList.toggle('has-waiting', hasWaiting);

  // ↓ 以下是现有逻辑，保持原状
  const activeTasks = tasks.filter(t => t.status === 'working' || t.status === 'waiting');
  // ...
}
```

设计要点：
- `tasks` 来源是 main.js 经过 `filteredTasks.slice(0, 5)` 后发给渲染进程的列表，**包含 waiting 状态**（filter 只剔除 sessions 重复项，不会按 status 过滤）。
- 选择 `document.body` 而非 `#pet-container` 的好处：CSS 选择器可以同时控制覆盖层 + 任务列表项的额外强调（本 PR 暂不做后者，但保留扩展空间）。
- `updateTasks` 在 `tasks.length === 0` 分支也会走到，所以 waiting 全部解除时 `hasWaiting=false`，覆盖层立即消失，无需额外 reset。
- 不在 renderer 层做去重 / 通知，那些都是主进程职责。

> 备注：renderer 的 `tasks` 数据源是 main.js [main.js#L242](../../pets/pet-desktop/src/main.js#L242) 的 `filteredTasks`。极端场景"sessions 数组吃掉了 waiting task → renderer 看不到 waiting 但 main 看得到"也成立，**主进程不依赖 renderer 端的 hasWaiting**，主进程消费的是未经过滤的原始 `hookTasks`，保证通知 / flashFrame / badge 始终触发。Renderer 端的 hasWaiting 仅服务于 UI 覆盖层，且 filteredTasks 在常见场景下与 hookTasks 中 waiting 集合一致（waiting 任务必然有 hook 记录）。

---

### 4.3 覆盖层样式（index.html 内联 CSS + DOM）

#### 4.3.1 DOM 结构

修改 `<body>` 内 `#pet-container` 区块为：

```html
<div id="pet-container">
  <img id="pet-sprite" src="" alt="Pet">
  <div class="awaiting-approval-overlay" title="Waiting for your approval" aria-hidden="true">
    <span class="awaiting-approval-badge">!</span>
  </div>
</div>
```

设计要点：
- 覆盖层 DOM **始终存在**，由 `body.has-waiting` 控制可见性，避免每轮增删 DOM 抖动。
- "!" 用 CSS `<span>` 文字而不是 emoji 或 SVG 资源：
  - 不依赖系统 emoji 字体（部分 Windows 没装会显示 □）；
  - 不引入文件资源；
  - 字号 / 颜色 / 居中可纯 CSS 控制，最干净。
- `title` 属性同时承载 tooltip（"Waiting for your approval"），鼠标悬停可见。
- `aria-hidden="true"` 因为这是装饰层，不参与可访问性树。

#### 4.3.2 CSS

在 `<style>` 段末尾追加：

```css
/* ---------- approval-alert: 覆盖层 ---------- */
.awaiting-approval-overlay {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 128px;
  height: 128px;
  border: 3px solid #FFC107;
  border-radius: 12px;
  box-sizing: border-box;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.2s ease-out;
  /* 不显示时彻底不参与渲染 */
  visibility: hidden;
}

body.has-waiting .awaiting-approval-overlay {
  opacity: 1;
  visibility: visible;
  animation: awaiting-approval-pulse 1.5s ease-in-out infinite;
}

@keyframes awaiting-approval-pulse {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(255, 193, 7, 0.6);
    opacity: 1;
  }
  50% {
    box-shadow: 0 0 0 6px rgba(255, 193, 7, 0);
    opacity: 0.7;
  }
}

.awaiting-approval-badge {
  position: absolute;
  top: -10px;
  right: -10px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #FFC107;
  color: #1a1a1a;
  font-family: system-ui, -apple-system, sans-serif;
  font-size: 16px;
  font-weight: 900;
  line-height: 24px;
  text-align: center;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
}
```

设计要点：
- 颜色 `#FFC107` 与 [index.html#L16](../../pets/pet-desktop/src/index.html#L16) 已有的 `--indicator-waiting` 完全一致，视觉语言统一。
- 边框宽度 3px，圆角 12px，覆盖在 128×128 的 `#pet-sprite` 上方 / 同坐标。`#pet-container` 高 132px、宽度由父 body 200px 限制，覆盖层 left:50% + translateX(-50%) 居中。
- 脉冲动画用 `box-shadow` + `opacity`，不触发重排（performance 章节已约束）。
- 徽章绝对定位 `top:-10px right:-10px`，溢出容器一半，视觉更醒目。`#pet-container` 自身没有 `overflow: hidden`，溢出可见。
- Pointer-events: none，避免覆盖层吞掉点击事件，宠物本身的 click / drag 行为不受影响。

#### 4.3.3 与现有 working 动画的兼容

现有 `.floating` 动画作用在 `#pet-sprite` 上（[index.html#L132](../../pets/pet-desktop/src/index.html#L132)），覆盖层作用在 `#pet-container` 内的兄弟元素上，两者互不影响。working 期间宠物继续浮动，覆盖层叠加显示，符合需求 FR-4 的"覆盖层独立于宠物自身动画状态"。

---

### 4.4 preload.js

**无需改动**。

理由：
- B 方案（通知 / 闪烁 / 徽章）完全在主进程内部完成，没有 renderer → main 的请求；
- C 方案（CSS 覆盖层）只需要 renderer 自己根据现有的 `tasks-update` 数据决定 class，不需要额外 IPC；
- 通知点击聚焦逻辑在主进程通过 `Notification.on('click')` 处理，不涉及 renderer。

---

## 5. 接口与数据结构

### 5.1 任务 payload（既有，引用，不变）

参见 [§2.2 表](#22-任务-payload-字段来自-terminal-server本-pr-不变)。

### 5.2 主进程内存结构（新增）

```ts
// 类型注释（实际 JS 不写 type）
type NotifiedSession = {
  notifiedAt: number;   // Date.now() 时间戳
  lastStatus: string;   // 始终为 'waiting'，预留未来扩展
  cwd: string;          // 仅日志用途
};
const notifiedSessions: Map<string /* sessionId */, NotifiedSession>;
```

- **不持久化** 到磁盘 / electron-store；
- 进程退出即丢失；
- 不暴露给 renderer。

### 5.3 IPC 通道

无新增。

---

## 6. 跨平台兼容

| 平台 | Notification | flashFrame | setBadgeCount | AppUserModelId |
|------|--------------|------------|---------------|---------------|
| macOS | ✓ 原生通知中心 | ✓ Dock 弹跳 | ✓ Dock 角标 | 不需要 |
| Windows | ✓ Action Center | ✓ 任务栏闪烁 | ✗ 静默忽略 | **必须设置**（本 PR 已加） |
| Linux | ✓ libnotify | 桌面环境差异 | Unity 支持，其余忽略 | 不需要 |

降级链：
1. 主进程协调器入口先判断 `mainWindow` 是否存活（`!mainWindow || mainWindow.isDestroyed()` 直接 return）。
2. `Notification.isSupported() === false` → 跳过通知，仍执行 flashFrame + 覆盖层 + badge（badge 在非 darwin 已被跳过）。
3. `setBadgeCount` 只在 `process.platform === 'darwin'` 下调用，且包 try/catch（早期 Linux Unity 兼容），失败仅 console.log。
4. `flashFrame` 在所有平台都安全（Linux 无效果但不抛错）。

---

## 7. 边界与风险

| 场景 | 行为 | 是否可接受 |
|------|------|-----------|
| 用户在 waiting 期间重启宠物 | `notifiedSessions` 丢失 → 下一轮立即重新通知一次 | 可接受（AC-6 明确） |
| 多任务同时进入 waiting | 协调器逐个 task 触发 notify()，OS 通知中心叠加多条 | 可接受（MVP 不做合并） |
| `waiting → working → waiting`（拒绝后再问） | 第二次进入 waiting 时 `prev.lastStatus !== 'waiting'` 成立 → 重新通知 | 期望行为，符合 FR-5 |
| `waiting → 任务消失`（session 被 kill） | 协调器扫描 `currentWaiting`，旧 id 不在 → 清理 + flashFrame(false) + badge=0 | 正常 |
| `waitingMessage` 缺失或为空字符串 | 通知 body fallback 到 `lastToolSummary`，再 fallback 到固定文案 "A task is waiting for your approval" | 符合 FR-1 |
| terminal-server 临时不可达 | 既有 `try/catch (e) {}` 已吞错，hookTasks=[]，协调器读到空数组 → 视为"无 waiting"，stop flashFrame | 正常 |
| 单次轮询协调器抛异常 | 已通过位置（在 `sessions-update` 之后）+ `try/catch` 兜底，不影响渲染主链路 | 健壮 |
| Windows 用户通知权限被关 | `Notification.show()` 不抛错但用户看不到 | 接受，已写日志 |

---

## 8. 实施步骤（给实施 Agent 用）

按"由内而外、易自测"顺序：

1. **CSS 覆盖层先行**（index.html）
   - 加入 DOM 与样式；
   - 直接在 DevTools 给 `<body>` 临时加 `has-waiting` class，肉眼验证覆盖层与脉冲动画。
   - 此步骤完成后即可对照 AC-5 视觉验收。

2. **renderer.js 联动**
   - `updateTasks` 中插入 `hasWaiting` 计算；
   - 用 `curl` 模拟一次 waiting hook（见 §9）观察 body class 切换；
   - 验证 waiting 解除后 class 自动移除。

3. **main.js 协调器骨架**
   - 引入 `Notification`；
   - 添加 `notifiedSessions`、`extractProjectName`、`reconcileApprovalAlerts`；
   - `refreshAll()` 中接入；
   - 仅 console.log，先不调通知，确认边沿检测日志正确。

4. **接入 flashFrame + badgeCount**
   - 监听 `mainWindow.on('focus')`；
   - 验证窗口失焦下 flashFrame 启动、聚焦后停止；
   - macOS 上观察 Dock 徽章计数。

5. **接入 Notification + 点击聚焦**
   - 写 `showApprovalNotification`；
   - 验证点击通知后宠物窗口被 show + focus；
   - 验证多次 waiting 周期通知次数符合去重规则。

6. **Windows AUMID 兜底**
   - `app.whenReady` 内 `setAppUserModelId('com.agentpet.desktop')`；
   - 在 Windows 上回归一次 AC-1。

7. **回归 AC-1 ~ AC-10 全清单**
   - 对照 [requirements.md §5](./requirements.md#5-验收标准acceptance-criteria) 逐条勾选；
   - 失败项记录到本文档 §10 变更记录。

---

## 9. 自测方案

由于真实审批事件依赖 Claude Code 的 PermissionRequest / Notification hook 触发，自测期间用 `curl` 直接模拟。

### 9.1 触发一次 waiting

PowerShell 单行命令：

```powershell
curl.exe -X POST http://localhost:3456/api/hook `
  -H "Content-Type: application/json" `
  -d '{"session_id":"test-approval-001","hook_event_name":"Notification","message":"Bash command needs your approval: npm install","cwd":"D:/projects/agent-pet"}'
```

> 注意：Windows PowerShell 内置 `curl` 是 `Invoke-WebRequest` 的 alias，与真正的 curl 行为不同；用 `curl.exe` 显式指定二进制。`-d` 单引号 JSON 在 PowerShell 下 OK。

注意 server 侧 `processHookEvent` 的逻辑（[index.js#L143-L149](../../packages/terminal-server/src/index.js#L143)）：`message` 字段需要现有 hookTask（即先有过 PreToolUse 之类事件），否则不会建出 task。所以**先**触发一次 working，再触发 waiting：

```powershell
# 1) 先制造一个 working task
curl.exe -X POST http://localhost:3456/api/hook `
  -H "Content-Type: application/json" `
  -d '{"session_id":"test-approval-001","hook_event_name":"PreToolUse","tool_name":"Bash","tool_input":{"command":"npm install"},"cwd":"D:/projects/agent-pet"}'

# 2) 再切换为 waiting
curl.exe -X POST http://localhost:3456/api/hook `
  -H "Content-Type: application/json" `
  -d '{"session_id":"test-approval-001","hook_event_name":"Notification","message":"Bash command needs your approval","cwd":"D:/projects/agent-pet"}'
```

### 9.2 解除 waiting

发送一次 PostToolUse，server 会把 status 切回 working / completed：

```powershell
curl.exe -X POST http://localhost:3456/api/hook `
  -H "Content-Type: application/json" `
  -d '{"session_id":"test-approval-001","hook_event_name":"PostToolUse","tool_name":"Bash","tool_response":{"success":true},"cwd":"D:/projects/agent-pet"}'
```

或直接删除：

```powershell
curl.exe -X DELETE http://localhost:3456/api/hooks/test-approval-001
```

### 9.3 多 session 并发（验证 AC-7）

把 §9.1 的两步换 `session_id` 与 `cwd` 各跑一次（如 `test-approval-002` + `cwd=D:/projects/foo`），观察是否收到 2 条通知，且通知 body 中 project 字段分别为 `agent-pet` / `foo`。

### 9.4 去重验证（AC-4）

连续两次发送同一 `session_id` 的 Notification（中间不 PostToolUse），观察通知中心仅出现 1 条。

### 9.5 平台冒烟

| 测试项 | macOS | Windows | Linux |
|--------|-------|---------|-------|
| 通知出现 | ✓ | ✓ | 视环境 |
| 任务栏闪烁 | Dock 弹跳 | 任务栏高亮 | 视环境 |
| Dock 徽章 | 数字显示 | N/A | N/A |
| 覆盖层 | ✓ | ✓ | ✓ |
| 通知点击聚焦 | ✓ | ✓ | ✓ |

---

## 10. 变更记录

> 实施过程中每完成一步，在此追加一行（含 commit hash 简略 + 关键改动说明 + 自测结果）。

| 日期 | 步骤 | 文件 | 关键改动 | 自测结论 |
|------|------|------|----------|---------|
| - | - | - | - | - |

---

## 文档元信息

- 编写人：架构师 / 资深 Electron 工程师（受项目经理委派）
- 编写日期：2026-05-09
- 关联文档：[requirements.md](./requirements.md)
- 下一步交付：测试用例（test-cases/frontend/） + 编码实施
