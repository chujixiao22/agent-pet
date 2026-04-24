# Claude Code 电子宠物 - 需求文档

## 1. 项目概述

### 项目名称
Claude Pet (电子宠物)

### 项目类型
Claude Code 插件/桌面客户端

### 核心功能
开发一个 Claude Code 电子宠物插件，当用户在 Claude Code 输入 `/pets` 时触发，在屏幕右下角显示一只可爱的电子宠物，监听 Claude Code 工作状态并用动画展示。

### 目标用户
- Claude Code 用户
- 开发者群体
- 追求趣味性和个性化的用户

---

## 2. 功能需求

### 2.1 Skill 入口

| 需求编号 | 需求描述 | 优先级 |
|---------|---------|--------|
| SK-001 | 用户输入 `/pets` 命令触发电子宠物显示 | P0 |
| SK-002 | 支持 `/pets help` 显示帮助信息 | P1 |
| SK-003 | 支持 `/pets config` 打开配置文件 | P1 |
| SK-004 | 支持 `/pets hide` 隐藏宠物 | P1 |
| SK-005 | 支持 `/pets show` 显示宠物 | P1 |

### 2.2 宠物显示

| 需求编号 | 需求描述 | 优先级 |
|---------|---------|--------|
| DISP-001 | 宠物显示在屏幕右下角，可通过配置调整位置 | P0 |
| DISP-002 | 宠物窗口始终置顶，不影响其他操作 | P0 |
| DISP-003 | 宠物窗口无边框、完全透明背景 | P0 |
| DISP-004 | 支持鼠标悬停显示宠物名称气泡 | P1 |
| DISP-005 | 支持拖拽宠物调整位置 | P2 |

### 2.3 状态监听

| 需求编号 | 需求描述 | 优先级 |
|---------|---------|--------|
| MON-001 | 监听 Claude Code 进程启动/退出状态 | P0 |
| MON-002 | 监听当前项目的 Git 状态（是否有未提交更改） | P1 |
| MON-003 | 监听 Claude Code 是否正在执行任务（思考中/生成中/空闲） | P0 |
| MON-004 | 仅检测当前启动目录的项目情况（项目隔离） | P0 |

### 2.4 宠物动画状态机

| 需求编号 | 需求描述 | 优先级 |
|---------|---------|--------|
| ANIM-001 | **Idle 状态**：宠物日常待机动作（眨眼、轻微晃动耳朵） | P0 |
| ANIM-002 | **Working 状态**：Claude Code 执行任务时（敲击键盘、滚动代码） | P0 |
| ANIM-003 | **Thinking 状态**：AI 思考中（沉思、挠头） | P0 |
| ANIM-004 | **Success 状态**：任务完成时（欢呼、跳跃） | P1 |
| ANIM-005 | **Error 状态**：执行出错时（沮丧、哭泣） | P1 |
| ANIM-006 | **Idle Long 状态**：长时间空闲时（打哈欠、睡觉） | P2 |

### 2.5 配置文件

| 需求编号 | 需求描述 | 优先级 |
|---------|---------|--------|
| CONF-001 | 宠物名字（name） | P0 |
| CONF-002 | 宠物类型/形象（type: cat/dog/bird/rabbit） | P0 |
| CONF-003 | 显示位置（position: bottom-right/bottom-left/custom） | P1 |
| CONF-004 | 偏移量（offsetX, offsetY） | P2 |
| CONF-005 | 动画速度（animationSpeed: slow/normal/fast） | P2 |

---

## 3. 非功能性需求

### 3.1 性能需求
- 宠物客户端内存占用 < 100MB
- CPU 占用 < 5%（空闲状态）
- 启动时间 < 3 秒

### 3.2 兼容性需求
- 支持 Windows 10/11
- 支持 macOS 11+
- Electron 版本：latest stable

### 3.3 用户体验需求
- 宠物形象要可爱、精致
- 动画流畅，帧率 30fps 以上
- 状态切换动画平滑自然

---

## 4. 数据模型

### 4.1 配置文件 (pet-config/config.json)

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

---

## 5. 项目交付物

| 交付物 | 说明 |
|-------|------|
| pets/skill/pets.ts | Claude Code Skill 入口文件 |
| pets/pet-client/ | Electron 桌面客户端源码 |
| pets/pet-config/config.json | 宠物配置文件 |
| pets/status-monitor/monitor.ts | 状态监听器 |
| specs/pets/requirements.md | 需求文档 |
| specs/pets/technical-design.md | 技术设计文档 |

---

## 6. MVP 版本范围

### 必须交付 (P0)
- `/pets` 命令触发显示宠物
- Idle / Working / Thinking 三种动画状态
- 配置文件支持 name 和 type
- 基本的进程监听

### 后续迭代 (P1/P2)
- Success / Error 状态动画
- 鼠标交互
- 位置调整
- 更多宠物类型