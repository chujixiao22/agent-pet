@echo off
chcp 65001 >nul
cls
echo ========================================================
echo           🦊 桌面悬浮宠物 - 最终版 🦊
echo ========================================================
echo.

REM 获取脚本所在目录
set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

echo [1/2] 检查图片...
if not exist "sprites\idle\frame_012.svg" (
    echo    ⚠️  发现缺少图片，正在生成...
    node generate-enhanced-pet-images.js
) else (
    echo    ✅ 图片已就绪
)

echo.
echo [2/2] 启动桌面悬浮宠物...
echo.

REM 使用 mshta 运行 HTA 应用
start "桌面宠物" mshta "%SCRIPT_DIR%DesktopPet.hta"

echo.
echo ========================================================
echo    ✅ 桌面悬浮宠物已启动！
echo ========================================================
echo.
echo    🦊 透明悬浮窗口
echo    📍 悬浮于桌面任何应用之上
echo    🖱️  点击: 显示爱心
echo    📱  右键: 隐藏/退出菜单
echo    🔄 自动切换6种状态
echo.
echo    💡 拖拽宠物可移动位置
echo.
echo ========================================================
echo.
echo    按任意键关闭此窗口...
pause >nul