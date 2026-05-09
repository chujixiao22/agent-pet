# 审批提醒功能需求文档

> 任务代号：approval-alert
> 文档类型：需求文档（Requirements）
> 适用项目：agent-pet（Claude Code 桌面陪伴宠物）
> 关联模块：pet-desktop（Electron 主进程 + 渲染进程）

---

## 1. 背景与目标

### 1.1 痛点描述

agent-pet 是一只挂在桌面上的"小宠物"，用于陪伴并可视化呈现 Claude Code 当前的工作状态。它通过每秒轮询 `http://localhost:3456/api/hooks` 获取 terminal-server 上报的任务状态，并在窗口里以动画形式展示。

当前最大的可用性缺陷是：**Claude Code 一旦卡在需要人工审批的环节（例如执行命令前的 PermissionRequest、编辑前的二次确认等），宠物在视觉上仍然表现为"正在工作中"**，与真正在跑任务的状态完全无法区分。这导致：

- 用户切到其他窗口（写文档、看资料、开会）时，无法及时察觉 Claude Code 已经停下来等审批；
- 必须主动切回终端窗口才能看到提示，宠物作为"状态指示器"的核心价值被削弱；
- 多会话并发时，更不知道是哪个项目卡住了，等更久才发现。

### 1.2 现状定位

经前期调研已确认：

- **terminal-server 侧已正确收到审批信号**（Notification 事件），并把对应任务的 `status` 字段标记为 `'waiting'`。该链路无需改动。
- **问题出在 pet-desktop 的渲染端**：`renderer.js` 把 `working` 与 `waiting` 合并为"活跃任务"一类处理（参见 `pets/pet-desktop/src/renderer.js:271`），导致 waiting 信号在 UI 层被吞掉，没有任何区别于 working 的反馈。

### 1.3 目标

在不改 terminal-server、不新增 hook、不动皮肤包的前提下，让 pet-desktop 在感知到 `status === 'waiting'` 时，**通过操作系统级提醒和宠物画面覆盖层两种方式**，把"需要你审批"这件事推到用户面前。

具体目标：

1. 用户在做别的事时，能被操作系统通知/任务栏闪烁/Dock 徽章叫回来；
2. 用户瞥一眼宠物窗口，能立刻区分"真在跑"和"卡在等审批"；
3. 多会话场景下，能定位到是哪个 cwd / session 在等待。

### 1.4 改造定位

本功能预期作为社区共创回馈给原作者，因此改动范围必须严格收敛：**只动 pet-desktop 的主进程和渲染进程**，不引入新依赖、不动数据契约、不破坏现有皮肤兼容性。

---

## 2. 用户故事

- **US-1（被叫回审批）**：作为正在写文档的开发者，我希望宠物在 Claude Code 卡住等审批时通过系统通知和任务栏闪烁主动叫我，以便我不必每隔几分钟就去切一次终端窗口确认进度。
- **US-2（一眼区分状态）**：作为偶尔瞥一眼桌面宠物的开发者，我希望能立刻看出宠物到底是"在工作"还是"在等审批"，以便不再误以为它还在跑而继续等待。
- **US-3（多会话定位）**：作为同时开了多个 Claude Code 会话的开发者，我希望系统通知里直接告诉我是哪个项目（cwd）在等审批，以便我快速切到对应终端处理，而不是逐个会话去翻。

---

## 3. 功能需求（Functional Requirements）

> 编号规则：FR-{序号}。所有编号在本文档及后续测试用例中可被引用。

### FR-1：OS 系统通知

- **触发条件**：某个任务的 `status` 从非 `waiting`（包括 `working`、首次出现、`completed`、`interrupted`）变为 `waiting`。
- **系统行为**：通过 Electron `Notification` API 弹出一条系统级通知。
- **通知内容**（**英文文案，硬编码，不引入 i18n 框架；详见 FR-7**）：
  - 标题：固定为 `Claude Code needs your approval`。
  - 正文格式：`[{project}] {toolName}: {message}`，其中：
    - `{project}`：取 `cwd` 的最后一段目录名作为简称（例如 `agent-pet`）；
    - `{toolName}`：触发审批的工具名（取自任务字段，例如 `Bash`、`Edit`），缺失时省略该段；
    - `{message}`：来自任务的 `waitingMessage` 字段，截断长度上限 80 字符（与 terminal-server `index.js` 第 148 行 `.slice(0, 80)` 保持一致），避免溢出；
    - 若 `{toolName}` 与 `{message}` 均缺失，正文回退为 `[{project}] A task is waiting for your approval`；
    - 若 `cwd` 也缺失，正文进一步回退为 `A task is waiting for your approval`。
- **用户可见反馈**：操作系统原生通知出现在系统通知区（macOS 右上角、Windows 右下角）。

### FR-2：任务栏 / Dock 闪烁（flashFrame）

- **触发条件**：当存在至少一个 `waiting` 任务，且**宠物窗口当前未获得焦点**（`win.isFocused() === false`）。
- **系统行为**：调用 `mainWindow.flashFrame(true)` 启动闪烁。
- **闪烁强度**：**持续闪烁**直到下方"停止条件"被触发。**不**做基于定时器的自动停止，也**不**对闪烁次数做人为上限——交由 OS 决定具体的闪烁节奏与视觉强度。
- **停止条件**：满足以下任一条件即调用 `mainWindow.flashFrame(false)`：
  1. 宠物窗口被聚焦——通过监听主窗口的 `focus` 事件，在 handler 中调用 `flashFrame(false)`；
  2. 所有 waiting 任务都已退出 waiting 状态。
- **平台差异**：macOS 上 `flashFrame` 表现为 Dock 图标弹跳；Windows 上为任务栏图标高亮闪烁（持续闪烁直到聚焦）；Linux 行为依发行版而异，无须特殊处理。

### FR-3：Dock 徽章 / 任务栏角标

- **徽章数字语义**：徽章数 `n` **严格等于当前 `status === 'waiting'` 的任务数**。**不包含** `working`、`completed`、`interrupted` 或任何其他状态的任务。换言之，徽章读数即"还有多少个会话在等你审批"，与 FR-4 覆盖层、FR-1 通知保持同一语义口径。
- **触发条件**：waiting 任务总数 `n` 发生变化（包括 0 ↔ 非 0 的切换）。
- **系统行为**：
  - **macOS**：调用 `app.setBadgeCount(n)`，`n === 0` 时徽章自动清除。
  - **Windows**：本期不实现自定义角标（需要 16x16 overlay icon 资源）；保持任务栏闪烁作为主要反馈。
  - **Linux**：依 Unity launcher 能力，`setBadgeCount` 在不支持的桌面环境下静默忽略，由 Electron 自身处理。
- **用户可见反馈**：macOS Dock 图标右上角显示数字徽章。

### FR-4：宠物画面视觉覆盖层（CSS 覆盖层）

- **触发条件**：当前任务列表中存在至少一个 `waiting` 任务。
- **系统行为**：在宠物精灵图（pet sprite）外层叠加一个 CSS 覆盖元素。
- **覆盖层视觉**：
  - 黄色（建议 `#FFD600` 或同等显眼度）外边框，宽度 3-4px，圆角与宠物容器一致；
  - 右上角显示一个"!"感叹号小图标（CSS/SVG 实现，纯前端不依赖图片资源）；
  - 可选：边框带轻微脉冲呼吸动画（CSS `@keyframes`，2s 周期，避免抢戏）。
- **悬浮提示（tooltip）**：覆盖层容器（或感叹号图标）的 `title` 属性固定为英文 `Waiting for your approval`（详见 FR-7）。
- **解除条件**：所有 waiting 任务都已退出 waiting 状态，覆盖层立即消失。
- **与现有动画的关系**：本覆盖层独立于宠物自身动画状态，working 动画继续播放，覆盖层只是叠加在外。

### FR-5：去重防骚扰

- **范围**：仅约束 FR-1（系统通知），不约束 FR-2 / FR-3 / FR-4（这些是基于当前状态的持续反馈，本身不会重复触发用户层面的骚扰）。
- **规则**：
  - 同一 `session_id` 在同一 waiting 周期内**只发一次**通知；
  - "同一 waiting 周期"定义：从该 session 进入 waiting 起，到它离开 waiting（变为 working / completed / interrupted / 任务消失）为止；
  - 离开 waiting 后再次进入 waiting，视为新的周期，允许再次通知。
- **实现提示**：维护一个 `Set<session_id>` 记录"已通知过本周期"的 session；轮询比对前后状态时维护进出周期的 in/out 集合。

### FR-6：通知与窗口的点击行为

- **点击系统通知**：调用 `BrowserWindow.show()` + `focus()`，把宠物窗口置顶并聚焦。聚焦后由 FR-2 自动停止 flashFrame。
- **点击宠物窗口本身**：保持现有行为不变，本 PR 不修改。"点击宠物跳回终端"是另外一个独立 PR 的范畴。

### FR-7：用户可见文案语言（英文，硬编码）

- **范围**：本 FR 是规范全局约束，覆盖 FR-1 / FR-4 以及 FR-6 中所有面向最终用户的字符串。
- **语言**：所有用户可见字符串**统一使用英文**。包括但不限于：
  - 系统通知标题（FR-1）；
  - 系统通知正文与各级回退文案（FR-1）；
  - 覆盖层 `title` 属性 / tooltip（FR-4）；
  - 任何因运行期异常而需要展示给用户的提示文字（如有）。
- **建议文案（参考实现取值，可在编码时微调）**：
  - 通知标题：`Claude Code needs your approval`
  - 通知正文（含 toolName 与 message）：`[{project}] {toolName}: {message}`
  - 通知正文（toolName/message 缺失时）：`[{project}] A task is waiting for your approval`
  - 通知正文（cwd 也缺失时）：`A task is waiting for your approval`
  - 覆盖层 tooltip：`Waiting for your approval`
- **实现方式**：直接硬编码英文字符串，**不**引入 i18n 框架（i18next、vue-i18n 等），**不**抽离 locale 文件。后续如需多语言由独立 PR 推进（详见第 6 节 Out of Scope）。
- **理由**：原作者项目 README 为中英混排，预期合入上游；先行硬编码英文可降低 PR review 阻力，并避免未来重构 i18n 时的二次返工。

---

## 4. 非功能需求

### 4.1 性能

- 轮询保持现有的 1 秒间隔，**不**升级为 WebSocket 推送。
- 新增的 waiting 状态比对、去重 Set 维护均为 O(n) 复杂度（n = 当前任务数，实际上 n < 20），单次轮询额外耗时应 < 1ms，开销可忽略。
- 覆盖层 CSS 动画使用 `transform` / `opacity`，避免重排，不影响渲染性能。

### 4.2 跨平台兼容

- **macOS**：FR-1 / FR-2 / FR-3 / FR-4 全部生效。
- **Windows**：FR-1 / FR-2 / FR-4 生效；FR-3 中的 Dock 徽章不适用，跳过即可，不抛错。
- **Linux**：FR-1 / FR-2 / FR-4 生效；FR-3 由 Electron 自动降级，不需要额外处理。
- 平台判断使用 `process.platform`，不允许出现因平台差异导致的运行时异常。

### 4.3 健壮性（无声失败）

- 通知 API 不可用（例如系统通知权限被拒、`Notification.isSupported() === false`）时，**降级为只显示宠物窗口覆盖层 + 任务栏闪烁**，不弹错误对话框、不写控制台 ERROR 日志（可写 INFO 级别）。
- 任何来自 `/api/hooks` 的异常字段（缺 `session_id`、缺 `cwd` 等）都应被防御性处理，不能让宠物主进程崩溃。

### 4.4 无侵入性

- **不**新增任何 hook，**不**修改 `init.js`，**不**修改 terminal-server，**不**修改皮肤包。
- **不**清理已知的过时配置（PermissionRequest hook、SETUP_GUIDE 中的过时脚本）—— 留待独立 PR 处理，避免本 PR 范围膨胀。
- 渲染端不引入新的运行时依赖；如确需图标资源，使用内联 SVG 或 CSS 绘制。

### 4.5 可观测性

- 在主进程使用 `console.log` 标记关键事件（`[approval-alert] notify session=xxx cwd=yyy`、`[approval-alert] flashFrame on/off`、`[approval-alert] badge=N`），便于调试。
- 不引入新的日志框架。

---

## 5. 验收标准（Acceptance Criteria）

> 编号规则：AC-{序号}，每条采用 Given / When / Then 描述，可手动验证。

- **AC-1（通知触达）**：
  - Given 宠物已运行，且当前没有 waiting 任务；
  - When Claude Code 触发一次需要人工审批的事件（例如 Bash 执行前的 PermissionRequest）；
  - Then 系统通知应在 2 秒内弹出（1 秒轮询 + 处理时间）；通知标题为英文 `Claude Code needs your approval`，正文遵循 FR-1 / FR-7 规定的 `[{project}] {toolName}: {message}` 格式且包含项目名（cwd 末段）。

- **AC-2（任务栏闪烁与停止）**：
  - Given 宠物窗口处于失焦状态；
  - When 一个新的 waiting 事件到达；
  - Then 任务栏 / Dock 开始**持续闪烁**（不基于定时器自动停），直到用户聚焦宠物窗口（主窗口 `focus` 事件触发）或所有 waiting 任务退出 waiting 状态后，闪烁立即停止。

- **AC-3（macOS Dock 徽章）**：
  - Given 当前 `status === 'waiting'` 的任务数 = 2、`status === 'working'` 的任务数 = 3，运行平台为 macOS；
  - When 查看 Dock；
  - Then Dock 图标右上角显示徽章 "2"（即仅计 waiting，不含 working）；当 waiting 数变为 0 时徽章消失，即使仍存在 working 任务。

- **AC-4（去重）**：
  - Given 某个 session 在 5 秒内连续两次进入 waiting，但中间没有离开 waiting 状态；
  - When 观察系统通知；
  - Then 仅收到 1 次通知（不重复弹）。

- **AC-5（覆盖层显示）**：
  - Given 至少有一个 waiting 任务；
  - When 查看宠物窗口；
  - Then 宠物图像外层有黄色边框，且右上角有 "!" 图标；waiting 全部解除后覆盖层立即消失。

- **AC-6（重启可用）**：
  - Given 关闭宠物进程后再重新启动；
  - When 收到新的 waiting 事件；
  - Then FR-1 ~ FR-4 全部正常工作，不依赖任何持久化状态。

- **AC-7（跨会话区分）**：
  - Given 两个不同 cwd 的会话同时进入 waiting；
  - When 观察通知；
  - Then 每个 session 各收到 1 次通知，且通知中的项目名能正确反映各自的 cwd 末段。

- **AC-8（点击通知聚焦）**：
  - Given 系统通知已弹出，宠物窗口处于失焦或最小化；
  - When 用户点击系统通知；
  - Then 宠物窗口被显示并聚焦到前台。

- **AC-9（通知 API 不可用降级）**：
  - Given 模拟 `Notification.isSupported()` 返回 false；
  - When 出现 waiting 事件；
  - Then 应用不崩溃，覆盖层和闪烁仍然生效（仅缺通知）。

- **AC-10（Windows 平台不报错）**：
  - Given 运行环境为 Windows；
  - When waiting 事件到达；
  - Then `setBadgeCount` 调用不抛出未捕获异常（即使无视觉效果），FR-1/FR-2/FR-4 正常工作。

- **AC-11（文案语言为英文）**：
  - Given 任一 waiting 事件到达，无论运行平台与系统语言；
  - When 观察系统通知与宠物窗口覆盖层；
  - Then 通知标题、通知正文（含所有回退分支）、覆盖层 tooltip 均为英文字符串，不含任何中文字符；且代码里对应字符串为硬编码，不经过任何 i18n/locale 查表。

---

## 6. 范围外（Out of Scope）

明确声明以下事项**不在本 PR 范围内**：

1. **不**新增 waiting 专属动画状态或皮肤帧（即原方案 A，需要美术资源，留待后续 PR）。
2. **不**把轮询升级为 WebSocket / SSE 推送。
3. **不**清理已过时的 PermissionRequest hook 配置。
4. **不**修改 SETUP_GUIDE 中的过时脚本。
5. **不**修改 terminal-server。
6. **不**修改 `init.js`。
7. **不**修改皮肤包（packages/agent-pet/skins 等）。
8. **不**做声音提醒（避免噪音干扰，且需要额外的开关设计与音频资源）。
9. **不**做"点击宠物跳回终端"功能（属于另一个独立 PR）。
10. **不**做用户可配置项（提醒开关、颜色、阈值等）—— 本 PR 全部使用硬编码默认值。
11. **不**引入 i18n / 多语言框架——所有用户可见文案硬编码为英文字符串（详见 FR-7）；中文或其他语言由独立 PR 推进。

---

## 7. 决议记录与未决问题

本节追踪需求评审过程中曾被列为"待决"的若干问题。截至本版本（见文档元信息日期），三项原始待决问题均已由用户拍板，记录如下；当前**暂无未决问题**。

### 7.1 已决议事项

1. **✅ 已决议：Windows 任务栏闪烁的强度** —— 采用"持续闪烁直到聚焦"。`flashFrame(true)` 调用后**不**做基于定时器的自动停止；唯一停止时机是主窗口 `focus` 事件触发或所有 waiting 任务退出 waiting 状态。此决议已落到 **FR-2**。
2. **✅ 已决议：通知文案语言** —— 直接采用**英文**硬编码，本 PR 不引入 i18n 框架。理由：原作者项目 README 为中英混排，预计向上游回馈 PR；先行硬编码英文可降低 review 阻力，且避免后续重构 i18n 时的二次返工。此决议已落到 **FR-1 / FR-4 / FR-7** 与 **第 6 节第 11 条**。
3. **✅ 已决议：Dock 徽章数字语义** —— 采用"仅 waiting 任务数"，**不包含** working。徽章读数 = 当前 `status === 'waiting'` 的任务数，与 FR-1 通知触发条件、FR-4 覆盖层显示条件保持同一语义口径。此决议已落到 **FR-3**。

### 7.2 未决问题

暂无。后续如出现需对齐的问题，再在此节追加。

---

## 8. 设计草图（文字描述）

### 8.1 覆盖层视觉

```text
┌──────────────────────────┐  ← 黄色外边框（#FFD600，3-4px，圆角同容器）
│                       ⚠ │  ← 右上角感叹号图标
│                          │     （20x20 圆形底，黄底黑字 "!"）
│      [ 宠物精灵图 ]      │
│      （working 动画继续）│
│                          │
│                          │
└──────────────────────────┘
        ↑
        边框可选呼吸动画：
        opacity 1.0 ↔ 0.6，2s 周期
```

### 8.2 状态变化时序

```text
T0: 任务 status=working  →  无覆盖层、无通知
T1: 任务 status=waiting  →  弹通知 + flashFrame on + 覆盖层显现 + badge=1
T2: 用户聚焦宠物窗口    →  flashFrame off（覆盖层和 badge 保留）
T3: 任务 status=working  →  覆盖层消失 + badge=0
T4: 任务再次 status=waiting → 新一轮通知 + 覆盖层 + badge=1（去重周期重置）
```

### 8.3 通知样式（示例）

```text
┌──────────────────────────────────────────────────┐
│  Claude Code needs your approval                 │
│  ──────────────────────────────────────────────  │
│  [agent-pet] Bash: npm install ...               │
└──────────────────────────────────────────────────┘
```

> 标题与正文均为英文硬编码（详见 FR-1 / FR-7）。`{toolName}` / `{message}` 缺失时按 FR-1 定义的回退文案输出。

---

## 文档元信息

- 编写人：业务分析师（受项目经理委派）
- 编写日期：2026-05-09
- 关联代码：`pets/pet-desktop/src/main.js`、`pets/pet-desktop/src/renderer.js`
- 下一步交付：`specs/approval-alert/technical-design.md`（技术设计文档，由架构师/技术负责人编写）
