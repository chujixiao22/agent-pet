# Skin Editor 技术设计文档

## 1. 概述

Skin Editor 是一个基于 Electron 的桌面应用程序，用于编辑和打包宠物皮肤的 SVG 帧动画。

### 1.1 功能需求

- **独立启动**: `claw-pet skin-editor` 启动在线编辑器
- **加载/创建皮肤**: 支持加载现有皮肤或创建新皮肤
- **预览动画**: 播放/暂停/帧率调节
- **替换帧**: 拖拽上传替换帧文件
- **重排帧顺序**: 拖拽调整帧顺序
- **调整帧率**: 独立调整每个状态的 FPS
- **导出功能**: 打包成 zip 文件，包含 manifest.json 和 animation_manifest.json

### 1.2 技术栈

- **Electron 28**: 桌面应用框架
- **JSZip 3.10**: zip 打包
- **SVG**: 帧动画格式
- **Canvas API**: 预览渲染

---

## 2. 项目结构

```
skin-editor/
├── package.json              # 项目配置
├── src/
│   ├── main.js               # Electron 主进程
│   ├── preload.js            # 预加载脚本（安全桥接）
│   ├── index.html            # 编辑器页面
│   ├── styles/
│   │   └── main.css          # 主样式文件
│   └── renderer/
│       ├── app.js            # 主应用逻辑
│       ├── preview.js        # 动画预览组件
│       ├── editor.js         # 帧编辑器组件
│       └── exporter.js       # 导出打包组件
├── assets/
│   └── default-skin/         # 默认皮肤模板
│       ├── manifest.json
│       ├── animation_manifest.json
│       └── {state}/
│           └── frame_001.svg
└── README.md
```

---

## 3. 数据结构

### 3.1 SkinPackage (导出格式)

```
{skin-name}.zip/
├── manifest.json             # 皮肤配置
├── animation_manifest.json   # 动画配置
└── {state}/                 # 状态目录
    ├── frame_001.svg
    └── frame_002.svg
    └── ...
```

### 3.2 manifest.json

```json
{
  "name": "skin-name",
  "displayName": "皮肤名称",
  "author": "author",
  "version": "1.0.0",
  "states": {
    "idle": { "fps": 10, "frames": 8, "loop": true },
    "idle_long": { "fps": 4, "frames": 6, "loop": true },
    "working": { "fps": 10, "frames": 8, "loop": true },
    "thinking": { "fps": 8, "frames": 8, "loop": true },
    "success": { "fps": 12, "frames": 8, "loop": false },
    "error": { "fps": 8, "frames": 8, "loop": false }
  }
}
```

### 3.3 animation_manifest.json

```json
{
  "version": "2.0.0",
  "totalFrames": 46,
  "states": {
    "idle": {
      "frameCount": 8,
      "duration": 100,
      "frames": [
        { "path": "idle/frame_001.svg", "width": 200, "height": 200 }
      ]
    },
    "idle_long": {
      "frameCount": 6,
      "duration": 250,
      "frames": []
    },
    "working": {
      "frameCount": 8,
      "duration": 100,
      "frames": []
    },
    "thinking": {
      "frameCount": 8,
      "duration": 125,
      "frames": []
    },
    "success": {
      "frameCount": 8,
      "duration": 83,
      "frames": []
    },
    "error": {
      "frameCount": 8,
      "duration": 125,
      "frames": []
    }
  }
}
```

---

## 4. 页面布局

```
+------------------------------------------------------------------+
|  Skin Editor                              [Load Skin] [Export]   |
+------------------------------------------------------------------+
|  +----------------+  +----------------------------------------+  |
|  | State List     |  |                                        |  |
|  |                |  |       Animation Preview                 |  |
|  | [x] idle       |  |       (Canvas 200x200)                 |  |
|  | [ ] idle_long  |  |                                        |  |
|  | [ ] working    |  |                                        |  |
|  | [ ] thinking   |  +----------------------------------------+  |
|  | [ ] success    |  +----------------------------------------+  |
|  | [ ] error      |  |  Timeline / Frame Strip                |  |
|  |                |  |  [1][2][3][4][5][6][7][8]  < >          |  |
|  +----------------+  +----------------------------------------+  |
|  +----------------+  +----------------------------------------+  |
|  | Skin Info      |  |  Controls                              |  |
|  | Name: [_____]  |  |  [Play] [Stop] [Prev] [Next]            |  |
|  | Author: [___] |  |  FPS: [10]  [+Add] [Delete] [Replace]   |  |
|  +----------------+  +----------------------------------------+  |
+------------------------------------------------------------------+
```

---

## 5. 模块设计

### 5.1 主进程 (main.js)

**职责**:
- 应用生命周期管理
- 窗口管理
- IPC 消息处理
- 文件系统操作（读写皮肤文件）
- 打包/解压 zip 文件

**主要 IPC 通道**:
| 通道名 | 方向 | 说明 |
|--------|------|------|
| `skin:load` | Renderer → Main | 加载皮肤包 |
| `skin:save` | Renderer → Main | 保存皮肤包 |
| `skin:export` | Renderer → Main | 导出 zip |
| `skin:import` | Renderer → Main | 导入皮肤 |
| `dialog:open-file` | Renderer → Main | 打开文件对话框 |
| `dialog:save-file` | Renderer → Main | 保存文件对话框 |

### 5.2 预加载脚本 (preload.js)

**职责**:
- 安全桥接主进程和渲染进程
- 暴露安全的 API 到渲染进程

**暴露的 API**:
```javascript
window.electronAPI = {
  loadSkin: (path) => ipcRenderer.invoke('skin:load', path),
  saveSkin: (skinData) => ipcRenderer.invoke('skin:save', skinData),
  exportSkin: (skinData, outputPath) => ipcRenderer.invoke('skin:export', skinData, outputPath),
  openFileDialog: (options) => ipcRenderer.invoke('dialog:open-file', options),
  saveFileDialog: (options) => ipcRenderer.invoke('dialog:save-file', options)
}
```

### 5.3 渲染进程

#### 5.3.1 app.js - 主应用逻辑

**职责**:
- 应用状态管理
- 协调各组件
- 事件分发

#### 5.3.2 preview.js - 动画预览组件

**职责**:
- Canvas 渲染管理
- 动画播放控制（play/pause/stop）
- 帧率控制
- 状态切换

**类结构**:
```javascript
class AnimationPreview {
  constructor(canvas)
  loadFrames(frames)  // 加载帧数据
  play()               // 播放动画
  pause()              // 暂停
  stop()               // 停止并重置
  setFPS(fps)          // 设置帧率
  nextFrame()          // 下一帧
  prevFrame()          // 上一帧
  goToFrame(index)     // 跳转到指定帧
}
```

#### 5.3.3 editor.js - 帧编辑器组件

**职责**:
- 帧列表管理
- 拖拽排序
- 帧替换
- 添加/删除帧

**类结构**:
```javascript
class FrameEditor {
  constructor(container)
  loadFrames(frames)     // 加载帧列表
  addFrame(file)         // 添加帧
  removeFrame(index)      // 删除帧
  replaceFrame(index, file) // 替换帧
  reorderFrames(fromIndex, toIndex) // 重排顺序
  onchange(callback)     // 变更回调
}
```

#### 5.3.4 exporter.js - 导出打包组件

**职责**:
- 生成 manifest.json
- 生成 animation_manifest.json
- 打包成 zip

**类结构**:
```javascript
class SkinExporter {
  constructor()
  setSkinData(skinData)    // 设置皮肤数据
  generateManifest()       // 生成 manifest.json
  generateAnimationManifest() // 生成 animation_manifest.json
  async exportZip(outputPath) // 导出 zip
}
```

---

## 6. CLI 命令

### 6.1 启动编辑器

```bash
claw-pet skin-editor
```

### 6.2 安装皮肤

```bash
claw-pet install {path-to-skin.zip}
```

---

## 7. 默认皮肤模板

位于 `assets/default-skin/`，包含:

- manifest.json: 默认配置
- animation_manifest.json: 默认动画配置
- idle/frame_001.svg ~ frame_008.svg
- idle_long/frame_001.svg ~ frame_006.svg
- working/frame_001.svg ~ frame_008.svg
- thinking/frame_001.svg ~ frame_008.svg
- success/frame_001.svg ~ frame_008.svg
- error/frame_001.svg ~ frame_008.svg

---

## 8. 状态机

```
                    +-------+
                    | IDLE  |
                    +---+---+
                        |
          +-------------+-------------+
          |             |             |
    +-----v----+  +-----v----+  +-----v-----+
    |IDLE_LONG |  | WORKING  |  | THINKING  |
    +-----+----+  +-----+----+  +-----+-----+
          |             |             |
          +------+------+             |
                 |                    |
           +-----v----+          +-----v-----+
           | SUCCESS  |          |   ERROR   |
           +----------+          +-----------+
```

---

## 9. 文件格式说明

### 9.1 SVG 帧要求

- 尺寸: 200x200 像素
- 格式: SVG 1.1
- 命名: frame_XXX.svg (XXX 为 3 位数字，从 001 开始)

### 9.2 Zip 包结构

```
{skin-name}.zip/
├── manifest.json
├── animation_manifest.json
├── idle/
│   ├── frame_001.svg
│   └── ...
├── idle_long/
│   └── ...
└── ... (其他状态)
```

---

## 10. 错误处理

| 错误类型 | 处理方式 |
|----------|----------|
| 文件读取失败 | 弹出错误提示，保持当前状态 |
| 无效的 SVG 文件 | 提示用户选择有效的 SVG 文件 |
| 打包失败 | 提示错误信息，保留临时文件 |
| 缺少必要状态 | 使用默认空状态 |

---

## 11. 待完成功能 (TODO)

- [ ] 撤销/重做支持
- [ ] 多选帧操作
- [ ] 批量导入帧
- [ ] 皮肤预览缩略图
- [ ] 状态复制功能
- [ ] 国际化支持
