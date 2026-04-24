@echo off
chcp 65001 >nul
cls
echo ========================================================
echo           🦊 桌面悬浮宠物 - 最终版 🦊
echo ========================================================
echo.

cd /d "%~dp0"

REM 检查图片
echo [1/4] 检查图片...
if not exist "sprites\idle\frame_012.svg" (
    echo    ⚠️  缺少图片，正在生成...
    node generate-enhanced-pet-images.js
) else (
    echo    ✅ 图片已就绪 (57帧)
)

REM 启动服务器
echo [2/4] 启动图片服务器...
tasklist | findstr "node.exe" >nul
if %errorlevel% neq 0 (
    start /b node pet-server.js > nul 2>&1
    timeout /t 2 /nobreak
)
echo    ✅ 服务器已启动

REM 启动HTA
echo [3/4] 启动桌面宠物窗口...
start "桌面宠物" mshta "%~dp0DesktopPet.hta"

echo.
echo ========================================================
echo    ✅ 桌面悬浮宠物已启动！
echo ========================================================
echo.
echo    🌐 服务器: http://localhost:3006
echo    🦊 宠物窗口: 已启动
echo.
echo    🖱️  点击: 显示爱心
echo    📱  右键: 退出菜单
echo    🔄 自动切换6种状态
echo.
echo ========================================================
echo.
echo    按任意键关闭此窗口...
pause >nul