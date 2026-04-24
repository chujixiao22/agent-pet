@echo off
echo 🦊 启动电子宠物服务器...
cd /d f:\codes\claw-pet\pets\pet-client

REM 检查端口是否被占用
netstat -ano | findstr :3000 >nul
if %errorlevel% equ 0 (
    echo 端口 3000 被占用，正在终止进程...
    taskkill /f /pid %errorlevel%
)

REM 启动服务器
echo 服务器启动中...
node web-server.js

pause