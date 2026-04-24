@echo off
echo ====================================
echo    🦊 电子宠物启动器
echo ====================================
echo.

REM 1. 生成真实宠物图片
echo [1/3] 生成宠物图片...
cd /d f:\codes\claw-pet\pets\pet-client
node generate-pet-images.js

echo.
echo [2/3] 图片生成完成！
echo    📁 位置: f:\codes\claw-pet\pets\pet-client\sprites\
echo    🎨 格式: SVG 格式（小狐狸猫）
echo    🎉 数量: 24 帧动画图片

echo.
echo [3/3] 启动宠物服务器...
echo    🔍 检查端口占用...
netstat -ano | findstr :3000 >nul
if %errorlevel% equ 0 (
    echo    ⚠️  端口 3000 被占用
    echo    尝试终止占用进程...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do (
        taskkill /f /pid %%a 2>nul
    )
    timeout /t 2 /nobreak
)

echo    🚀 启动宠物服务器...
start "宠物服务器" cmd /k "node simple-pet-server.js"

echo.
echo ====================================
echo    ✅ 电子宠物已启动！
echo ====================================
echo.
echo    📖 使用说明：
echo    1. 等待几秒钟让服务器启动
echo    2. 打开浏览器访问: http://localhost:3001
echo    3. 看到你的小狐狸猫宠物
echo.
echo    🎯 功能：
echo    - 🦊 真实 SVG 小狐狸猫图片
echo    - 🔄 自动切换6种状态（每5秒）
echo    - 🖱️  点击宠物显示爱心
echo    - 📱  右键菜单显示/隐藏/退出
echo.
echo ====================================
echo    按任意键关闭此窗口...
pause >nul