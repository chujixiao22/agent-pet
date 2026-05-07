# 宠物皮肤制作指南

## 目录结构

```
skin-name/
├── manifest.json          # 皮肤元数据
├── animation_manifest.json # 动画帧详情（可选）
├── idle/                 # 待机动画
│   ├── frame_001.svg
│   ├── frame_002.svg
│   └── ...
├── idle_long/            # 长时间待机动画
│   ├── frame_001.svg
│   └── ...
├── working/              # 工作动画
│   ├── frame_001.svg
│   └── ...
├── thinking/             # 思考动画
│   ├── frame_001.svg
│   └── ...
├── success/             # 成功动画
│   ├── frame_001.svg
│   └── ...
└── error/               # 错误动画
    ├── frame_001.svg
    └── ...
```

## 动画状态说明

| 状态 | 用途 | 帧数 | 循环 | 播放速度参考 |
|------|------|------|------|-------------|
| `idle` | 待机/空闲 | 8-12 帧 | ✅ | 约 100ms/帧 |
| `idle_long` | 长时间待机（问号/阶段性唤醒） | 6-8 帧 | ✅ | 约 250ms/帧 |
| `working` | 执行任务中 | 8-10 帧 | ✅ | 约 100ms/帧 |
| `thinking` | 思考中（4+任务高负荷） | 6-9 帧 | ✅ | 约 130ms/帧 |
| `success` | 成功/完成 | 6-8 帧 | ❌ | 约 80ms/帧 |
| `error` | 错误/中断 | 8-10 帧 | ❌ | 约 150ms/帧 |

## 文件要求

### 尺寸
- **建议尺寸：200x200 像素**（或任意正方形比例）
- 所有帧必须**尺寸一致**
- 实际显示时会缩放到 128x128px

### 格式
- **推荐 SVG**：体积小、清晰、可缩放
- 也支持 PNG（需修改代码中的扩展名）

### 背景
- **透明背景**（SVG 用 `<svg>` 无 fill 矩形；PNG 用透明通道）
- 或统一纯色背景（便于抠图）

### 命名
- 帧文件：`frame_001.svg`, `frame_002.svg`, ...（必须补零到 3 位）
- 目录名：`idle`, `idle_long`, `working`, `thinking`, `success`, `error`

## manifest.json 格式

```json
{
  "name": "skin-name",
  "displayName": "皮肤显示名称",
  "author": "作者名",
  "version": "1.0.0",
  "states": {
    "idle": { "fps": 10, "frames": 12, "loop": true },
    "idle_long": { "fps": 4, "frames": 8, "loop": true },
    "working": { "fps": 10, "frames": 10, "loop": true },
    "thinking": { "fps": 8, "frames": 9, "loop": true },
    "success": { "fps": 12, "frames": 8, "loop": false },
    "error": { "fps": 7, "frames": 10, "loop": false }
  }
}
```

## 动画帧数汇总

| 状态 | 最少 | 建议 | 最多 |
|------|------|------|------|
| idle | 6 | **10-12** | 16 |
| idle_long | 4 | **6-8** | 12 |
| working | 6 | **8-10** | 14 |
| thinking | 4 | **6-9** | 12 |
| success | 4 | **6-8** | 10 |
| error | 6 | **8-10** | 14 |
| **总计** | 32 | **46-57** | 78 |

## 安装方式

```bash
# 方式1：复制到 ~/.claw-pet/skins/ 目录
cp -r skin-name ~/.claw-pet/skins/

# 方式2：使用 CLI 安装
agent-pet install-skin /path/to/skin-name

# 激活皮肤
agent-pet skin skin-name
```

## 注意事项

1. **角色一致性**：同一角色不同帧应保持视觉一致（大小、位置、比例）
2. **动作流畅性**：帧与帧之间应有合理的过渡
3. **文件体积**：SVG 总大小建议 < 500KB
4. **首帧参考**：可提供第一帧作为后续帧生成的参考图

## 示例：cat-cute 皮肤结构

```
cat-cute/
├── manifest.json
├── idle/
│   ├── frame_001.svg ~ frame_012.svg (12帧)
├── idle_long/
│   ├── frame_001.svg ~ frame_008.svg (8帧)
├── working/
│   ├── frame_001.svg ~ frame_010.svg (10帧)
├── thinking/
│   ├── frame_001.svg ~ frame_009.svg (9帧)
├── success/
│   ├── frame_001.svg ~ frame_008.svg (8帧)
└── error/
    ├── frame_001.svg ~ frame_010.svg (10帧)
```
