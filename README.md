# claw-pet (桌面宠物)

A desktop companion pet for Claude Code

## 安装 Installation

```bash
# 1. 克隆仓库
git clone https://github.com/zunyan/agent-pet.git
cd agent-pet

# 2. 安装 CLI 工具
cd packages/agent-pet
npm install
npm link

# 3. 初始化（配置 Claude Code Hooks）
agent-pet init

# 4. 启动桌面宠物
agent-pet start
```

安装完成后，Claude Code 启动时桌面宠物会自动启动。

## 常用命令

| 命令 | 说明 |
|------|------|
| `agent-pet init` | 初始化并配置 Claude Code Hooks |
| `agent-pet start` | 启动桌面宠物 |
| `agent-pet stop` | 停止桌面宠物 |
| `agent-pet skin [name]` | 切换/查看皮肤 |
| `agent-pet build` | 构建桌面宠物 |
| `agent-pet setting` | 打开设置界面 |

## 开发者文档 Developer Guide

本地开发 claw-pet 源码请参考 [docs/SETUP_GUIDE.md](docs/SETUP_GUIDE.md)
