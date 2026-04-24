@echo off
cls
echo ========================================================
echo           🦊 增强版电子宠物启动器 🦊
echo ========================================================
echo.

REM 检查是否需要生成图片
echo [1/5] 检查宠物图片...
if not exist "sprites\idle\frame_012.svg" (
    echo    ⚠️  发现缺少图片，开始生成...
    echo.
    node generate-enhanced-pet-images.js
    echo.
    echo    ✅ 图片生成完成！
) else (
    echo    ✅ 图片已存在，跳过生成
)

echo.
echo [2/5] 清理旧的服务器进程...
tasklist | findstr "node.exe" >nul
if %errorlevel% equ 0 (
    echo    🔄 检测到 node 进程，正在清理...
    for /f "tokens=2 delims=," %%a in ('tasklist ^| findstr node.exe ^| findstr "simple-pet-server"') do (
        taskkill /f /pid %%b 2>nul
    )
    timeout /t 1 /nobreak
)

echo.
echo [3/5] 启动增强版电子宠物...
echo    🚀 正在启动服务器...
start "宠物服务器" cmd /k "node simple-pet-server.js"

echo.
echo ========================================================
echo    ✅ 增强版电子宠物已启动！
echo ========================================================
echo.
echo    📁 宠物位置: sprites\ (57帧增强动画)
echo    🦊 访问地址: http://localhost:3001
echo.
echo    ✨ 增强功能：
echo       🔄 更多帧数: 8-12帧/状态 (总计57帧)
echo       🎨 更多表情: 眨眼、耳动、胡须摆动
echo       🌟 更多特效: 星星、眼泪、光线、气泡
echo       📏 更大幅动作: 身体缩放、跳跃、摇头
echo       ⚡ 更流畅动画: 100-150ms/帧
echo.
echo    🎮 交互说明:
echo       🖱️  点击宠物: 显示爱心
echo       📱  右键菜单: 隐藏/显示/退出
echo       🔄 自动切换: 每4秒切换状态
echo.
echo ========================================================
echo.
echo    按任意键关闭此窗口...
echo.
pause >nul