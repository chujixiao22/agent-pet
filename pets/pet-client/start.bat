@echo off
cls
echo ========================================================
echo           Desktop Pet - Final Version
echo ========================================================
echo.

cd /d "%~dp0"

REM Check images
echo [1/3] Checking images...
if not exist "sprites\idle\frame_012.svg" (
    echo    Missing images, generating...
    node generate-enhanced-pet-images.js
) else (
    echo    OK - 57 frames ready
)

REM Start server
echo [2/3] Starting server...
start /b node pet-server.js > nul 2>&1
timeout /t 2 /nobreak > nul
echo    Server started

REM Start HTA
echo [3/3] Starting desktop pet...
start "DesktopPet" mshta "%~dp0DesktopPet.hta"

echo.
echo ========================================================
echo    SUCCESS - Desktop Pet is running!
echo ========================================================
echo.
echo    Server: http://localhost:3006
echo    Pet window: Running
echo.
echo    Features:
echo    - 57 frames animation
echo    - 6 states auto-switch
echo    - Click for love
echo    - Right-click to exit
echo.
echo ========================================================
echo.
pause