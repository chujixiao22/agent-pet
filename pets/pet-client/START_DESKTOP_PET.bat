@echo off
cls
echo ========================================================
echo           🦊 真正的桌面悬浮宠物 🦊
echo ========================================================
echo.
echo [1/3] 检查图片...
if not exist "sprites\idle\frame_012.svg" (
    echo    ⚠️  发现缺少图片，正在生成...
    node generate-enhanced-pet-images.js
) else (
    echo    ✅ 图片已就绪
)

echo.
echo [2/3] 启动 Electron 桌面宠物...
echo    🚀 正在启动真正的透明悬浮窗口...
echo.

REM 使用 Electron 启动桌面宠物
start "桌面宠物" electron electron-main.js

echo.
echo ========================================================
echo    ✅ 桌面悬浮宠物已启动！
echo ========================================================
echo.
echo    🦊 真正的透明悬浮窗口
echo    📍 悬浮于桌面任何应用之上
echo    🖱️  点击: 显示爱心
echo    📱  右键: 隐藏/退出菜单
echo    🔄 自动切换状态
echo.
echo    💡 拖拽宠物可以移动位置
echo    📌 位置会自动保存
echo.
echo ========================================================
echo.
echo    按任意键关闭此窗口...
pause >nul