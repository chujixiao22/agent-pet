@echo off
echo === 创建测试动画文件 ===

REM 创建目录结构
if not exist "sprites" mkdir sprites
if not exist "sprites\idle" mkdir sprites\idle
if not exist "sprites\idle_long" mkdir sprites\idle_long
if not exist "sprites\working" mkdir sprites\working
if not exist "sprites\thinking" mkdir sprites\thinking
if not exist "sprites\success" mkdir sprites\success
if not exist "sprites\error" mkdir sprites\error

REM 创建简单的占位图片（使用PowerShell）
echo 创建占位帧...

REM 创建一个简单的占位图文本文件
echo. > sprites\idle\frame_001.png.txt
echo. > sprites\idle\frame_002.png.txt
echo. > sprites\idle\frame_003.png.txt
echo. > sprites\idle\frame_004.png.txt

echo. > sprites\idle_long\frame_001.png.txt
echo. > sprites\idle_long\frame_002.png.txt
echo. > sprites\idle_long\frame_003.png.txt
echo. > sprites\idle_long\frame_004.png.txt

echo. > sprites\working\frame_001.png.txt
echo. > sprites\working\frame_002.png.txt
echo. > sprites\working\frame_003.png.txt
echo. > sprites\working\frame_004.png.txt

echo. > sprites\thinking\frame_001.png.txt
echo. > sprites\thinking\frame_002.png.txt
echo. > sprites\thinking\frame_003.png.txt
echo. > sprites\thinking\frame_004.png.txt

echo. > sprites\success\frame_001.png.txt
echo. > sprites\success\frame_002.png.txt
echo. > sprites\success\frame_003.png.txt
echo. > sprites\success\frame_004.png.txt

echo. > sprites\error\frame_001.png.txt
echo. > sprites\error\frame_002.png.txt
echo. > sprites\error\frame_003.png.txt
echo. > sprites\error\frame_004.png.txt

REM 创建动画清单
echo 创建动画清单...
(
echo {
echo   "version": "1.0.0",
echo   "totalFrames": 24,
echo   "states": {
echo     "idle": {
echo       "frameCount": 4,
echo       "duration": 250,
echo       "frames": [
echo         {"path": "idle/frame_001.png", "width": 180, "height": 180},
echo         {"path": "idle/frame_002.png", "width": 180, "height": 180},
echo         {"path": "idle/frame_003.png", "width": 180, "height": 180},
echo         {"path": "idle/frame_004.png", "width": 180, "height": 180}
echo       ]
echo     },
echo     "idle_long": {
echo       "frameCount": 4,
echo       "duration": 250,
echo       "frames": [
echo         {"path": "idle_long/frame_001.png", "width": 180, "height": 180},
echo         {"path": "idle_long/frame_002.png", "width": 180, "height": 180},
echo         {"path": "idle_long/frame_003.png", "width": 180, "height": 180},
echo         {"path": "idle_long/frame_004.png", "width": 180, "height": 180}
echo       ]
echo     },
echo     "working": {
echo       "frameCount": 4,
echo       "duration": 200,
echo       "frames": [
echo         {"path": "working/frame_001.png", "width": 180, "height": 180},
echo         {"path": "working/frame_002.png", "width": 180, "height": 180},
echo         {"path": "working/frame_003.png", "width": 180, "height": 180},
echo         {"path": "working/frame_004.png", "width": 180, "height": 180}
echo       ]
echo     },
echo     "thinking": {
echo       "frameCount": 4,
echo       "duration": 300,
echo       "frames": [
echo         {"path": "thinking/frame_001.png", "width": 180, "height": 180},
echo         {"path": "thinking/frame_002.png", "width": 180, "height": 180},
echo         {"path": "thinking/frame_003.png", "width": 180, "height": 180},
echo         {"path": "thinking/frame_004.png", "width": 180, "height": 180}
echo       ]
echo     },
echo     "success": {
echo       "frameCount": 4,
echo       "duration": 150,
echo       "frames": [
echo         {"path": "success/frame_001.png", "width": 180, "height": 180},
echo         {"path": "success/frame_002.png", "width": 180, "height": 180},
echo         {"path": "success/frame_003.png", "width": 180, "height": 180},
echo         {"path": "success/frame_004.png", "width": 180, "height": 180}
echo       ]
echo     },
echo     "error": {
echo       "frameCount": 4,
echo       "duration": 300,
echo       "frames": [
echo         {"path": "error/frame_001.png", "width": 180, "height": 180},
echo         {"path": "error/frame_002.png", "width": 180, "height": 180},
echo         {"path": "error/frame_003.png", "width": 180, "height": 180},
echo         {"path": "error/frame_004.png", "width": 180, "height": 180}
echo       ]
echo     }
echo   }
echo }
) > sprites\animation_manifest.json

echo ✅ 测试文件创建完成
echo 📁 精灵目录: sprites\
echo 📋 动画清单: sprites\animation_manifest.json
echo.
echo 现在可以启动 electron 客户端测试:
echo npm start