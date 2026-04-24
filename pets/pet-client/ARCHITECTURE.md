# 🦊 桌面悬浮宠物 - 简化架构设计

## 🎯 核心目标

创建一个简单、自包含的桌面电子宠物应用，无需外部系统依赖。

## 📦 架构原则

### 1. ✅ 简单优先
- 单一职责：只负责显示宠物和状态切换
- 自包含：所有资源（图片、配置）都包含在应用内
- 无外部依赖：不需要 API、数据库、WebSocket

### 2. 🎨 纯前端应用
- Electron + HTML/CSS/JavaScript
- 状态管理：本地 JavaScript 变量
- 动画系统：CSS 动画或 Canvas 绘制

### 3. 🔄 本地化状态
- 配置文件：JSON 格式存储配置
- 状态文件：可选的外部状态监听
- 无网络通信：所有逻辑都在客户端

## 📁 目录结构

```
f:/codes/claw-pet/pets/pet-client/
├── main.js              # Electron 主进程
├── preload.js            # 预加载脚本
├── index.html            # 宠物界面
├── pet.js                # 宠物逻辑（动画、状态）
├── sprites/              # 宠物动画图片
│   ├── idle/           # 待机状态（4帧）
│   ├── working/        # 工作状态（4帧）
│   ├── thinking/       # 思考状态（4帧）
│   ├── success/        # 成功状态（4帧）
│   ├── error/          # 错误状态（4帧）
│   └── idle_long/      # 久等状态（4帧）
├── config.json           # 宠物配置（名字、大小等）
├── status.json           # 外部状态文件（可选）
└── package.json          # 项目配置
```

## 🎯 核心功能

### 1. 悬浮窗口
```javascript
// 透明、无边框、置顶窗口
new BrowserWindow({
  width: 200,
  height: 200,
  transparent: true,
  frame: false,
  alwaysOnTop: true,
  skipTaskbar: true,
  webPreferences: {
    nodeIntegration: true,
    contextIsolation: false
  }
})
```

### 2. 宠物动画系统
```javascript
// 使用 SVG 图片 + CSS 动画
class Pet {
  constructor() {
    this.currentStatus = 'idle';
    this.frameIndex = 0;
    this.sprites = loadSprites();
  }

  // 加载动画图片
  loadSprites() {
    return {
      idle: loadFrames('idle'),
      working: loadFrames('working'),
      thinking: loadFrames('thinking'),
      success: loadFrames('success'),
      error: loadFrames('error'),
      idle_long: loadFrames('idle_long')
    };
  }

  // 切换状态
  setStatus(status) {
    this.currentStatus = status;
    this.startAnimation(status);
  }

  // 播放动画
  startAnimation(status) {
    const frames = this.sprites[status];
    // 循环播放帧
    setInterval(() => {
      this.frameIndex = (this.frameIndex + 1) % frames.length;
      this.updateImage(frames[this.frameIndex]);
    }, 250);
  }
}
```

### 3. 状态管理系统
```javascript
// 本地配置
const config = {
  petName: 'Whiskers',
  petSize: 'normal',
  animationSpeed: 'normal',
  startPosition: 'bottom-right'
};

// 状态监听（可选）
function monitorExternalStatus() {
  // 监听本地文件或模拟状态
  setInterval(() => {
    const status = readStatusFile();
    pet.setStatus(status);
  }, 2000);
}
```

### 4. 基本交互
```javascript
// 点击交互
petContainer.addEventListener('click', () => {
  showStatusMessage();
});

// 拖拽移动
petContainer.addEventListener('mousedown', startDrag);
document.addEventListener('mousemove', onDrag);
document.addEventListener('mouseup', stopDrag);

// 右键菜单
petContainer.addEventListener('contextmenu', showContextMenu);
```

## 🚀 部署方案

### 方案 1：独立应用
```bash
# 开发
npm install
npm start

# 打包
npm run build

# 分发：提供 .exe 安装包
```

### 方案 2：快捷方式
```bash
# 直接运行（开发模式）
node main.js
```

## 💾 配置系统

### 本地配置文件
```json
{
  "petName": "Whiskers",
  "petSize": 180,
  "position": {
    "x": "right-20",
    "y": "bottom-20"
  },
  "behavior": {
    "stayOnTop": true,
    "clickToShow": true,
    "autoHide": false
  },
  "animation": {
    "frameRate": 4,
    "transitionSpeed": 250
  }
}
```

### 外部状态文件（可选）
```json
{
  "status": "idle",
  "message": "Waiting...",
  "lastUpdate": 1712987654321
}
```

## 🎯 MVP 功能清单

### 核心功能 ✅
- [x] 桌面悬浮窗口
- [x] 宠物动画显示
- [x] 6种状态切换
- [x] 帧动画循环
- [x] 基本点击交互
- [x] 拖拽移动
- [x] 右键菜单
- [x] 本地配置系统

### 可选功能 ⭕
- [ ] 快捷键显示/隐藏
- [ ] 多主题支持
- [ ] 宠物商店（更换皮肤）
- [ ] 状态统计
- [ ] 系统托盘图标

## 📱 技术栈

### 必需
- Electron（桌面应用框架）
- Node.js（运行时）
- HTML/CSS/JavaScript（界面）
- SVG（宠物图片）

### 可选
- Canvas（更高级动画效果）
- TypeScript（类型安全）

## 🎨 宠物设计

### 当前设计
- **形象**：小狐狸猫
- **风格**：Q 版卡通
- **格式**：SVG 矢量图
- **尺寸**：180x180 像素

### 状态表情
| 状态 | 表情 | 特效 |
|-----|------|------|
| Idle | 正常 | 缓慢呼吸 |
| Working | 专注 | 左右移动 |
| Thinking | 疑问 | 头部歪斜 |
| Success | 开心 | 弹跳 + 星星 |
| Error | 难过 | 泪水 + 灰暗 |
| Idle_Long | 瞌睡 | Z 气泡 + 呼噜 |

## 🎉 总结

这是一个**真正的桌面悬浮宠物**，专注于：

1. **简单性**：最小依赖，易于维护
2. **自包含**：所有资源都在应用内
3. **可配置**：通过本地 JSON 配置
4. **可扩展**：预留扩展接口
5. **用户体验**：流畅动画，即时响应

---

**不需要外部系统！** 纯本地化桌面宠物应用。