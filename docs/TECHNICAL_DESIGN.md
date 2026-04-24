# 电子宠物 - 桌面应用技术设计方案

## 1. 项目概述

### 目标
交付一个真正的Windows桌面exe电子宠物程序，用户无需安装任何依赖，双击即可运行。

### 技术选型
- **Electron**: 成熟的跨平台桌面应用框架
- **electron-builder**: 打包为独立exe
- **SVG动画**: 矢量图形，清晰不失真

## 2. 技术架构

### 主进程 (main.js)
```javascript
// 窗口管理
- 创建透明悬浮窗口
- 设置置顶、隐藏任务栏
- 窗口位置记忆
- 系统托盘支持

// IPC通信
- 与渲染进程通信
- 状态文件监听
```

### 渲染进程 (renderer.js)
```javascript
// 动画系统
- 帧动画播放器
- 状态切换管理
- 动画帧预加载

// 交互处理
- 点击事件
- 右键菜单
- 拖拽移动
```

## 3. 窗口配置

```javascript
{
  width: 200,
  height: 200,
  transparent: true,      // 透明背景
  frame: false,          // 无边框
  alwaysOnTop: true,     // 置顶
  skipTaskbar: true,     // 隐藏任务栏
  resizable: false,      // 不可调整大小
  webPreferences: {
    nodeIntegration: false,
    contextIsolation: true
  }
}
```

## 4. 动画系统

### 帧动画播放
- 每秒30fps流畅动画
- 预加载所有帧
- 状态切换平滑过渡

### 状态定义
| 状态 | 帧数 | 描述 |
|-----|------|------|
| idle | 12 | 待机呼吸 |
| working | 10 | 工作敲键盘 |
| thinking | 9 | 思考问号 |
| success | 8 | 成功庆祝 |
| error | 10 | 错误难过 |
| idle_long | 8 | 久等睡觉 |

## 5. 打包方案

### electron-builder配置
```json
{
  "appId": "com.clawpet.desktop",
  "productName": "DesktopPet",
  "win": {
    "target": "portable",
    "icon": "assets/icon.ico"
  },
  "portable": {
    "artifactName": "DesktopPet.exe"
  }
}
```

### 输出
- `DesktopPet.exe` - 可直接运行的exe文件
- 无需安装，双击运行
- 可移动到任意位置

## 6. 目录结构

```
pet-desktop/
├── src/
│   ├── main.js          # 主进程
│   ├── preload.js       # 预加载
│   ├── renderer.js      # 渲染进程
│   └── window.js       # 窗口管理
├── assets/
│   ├── sprites/         # 57帧SVG动画
│   └── icon.ico         # 应用图标
├── package.json
├── electron-builder.yml
└── README.md
```

## 7. 核心功能

### 必须功能
1. ✅ 透明悬浮窗口
2. ✅ 57帧流畅动画
3. ✅ 6种状态自动切换
4. ✅ 点击交互显示消息
5. ✅ 右键菜单(退出)
6. ✅ 拖拽移动位置
7. ✅ 生成独立exe

### 可选功能
- [ ] 系统托盘
- [ ] 开机自启
- [ ] 快捷键

## 8. 验收标准

### 功能验收
- [ ] exe文件可正常运行
- [ ] 宠物动画流畅显示
- [ ] 状态每4秒自动切换
- [ ] 点击显示交互消息
- [ ] 右键显示退出菜单
- [ ] 可拖拽移动位置

### 质量标准
- 无崩溃、无白屏
- 内存占用 < 200MB
- CPU占用 < 5%
- 启动时间 < 3秒