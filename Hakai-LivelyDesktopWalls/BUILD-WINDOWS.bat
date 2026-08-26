@echo off
title HAKAI Wallpaper Engine — Build
color 0B
cd /d "%~dp0"

echo.
echo  ==========================================
echo   HAKAI WALLPAPER ENGINE  ^|  BUILD TOOL
echo  ==========================================
echo.

:: ── Manually add common Node.js install locations to PATH ──────────────────
set "PATH=%PATH%;C:\Program Files\nodejs"
set "PATH=%PATH%;C:\Program Files (x86)\nodejs"
set "PATH=%PATH%;%APPDATA%\npm"
set "PATH=%PATH%;%LOCALAPPDATA%\Programs\nodejs"
set "PATH=%PATH%;%ProgramFiles%\nodejs"

:: ── Try to find node.exe directly if still not in PATH ────────────────────
if exist "C:\Program Files\nodejs\node.exe" (
    set "NODEPATH=C:\Program Files\nodejs"
    set "PATH=%PATH%;C:\Program Files\nodejs"
)
if exist "%LOCALAPPDATA%\Programs\nodejs\node.exe" (
    set "NODEPATH=%LOCALAPPDATA%\Programs\nodejs"
    set "PATH=%PATH%;%LOCALAPPDATA%\Programs\nodejs"
)

:: ── Check if node is now accessible ───────────────────────────────────────
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo  [!] Node.js not found in common locations.
    echo.
    echo  Please do ONE of these:
    echo.
    echo  OPTION A — Install Node.js (recommended):
    echo    1. Go to: https://nodejs.org
    echo    2. Click the big "LTS" download button
    echo    3. Run the installer (keep all defaults, click Next/Next/Finish)
    echo    4. RESTART your computer
    echo    5. Double-click BUILD-WINDOWS.bat again
    echo.
    echo  OPTION B — If you already installed Node.js:
    echo    1. Press Windows key + R
    echo    2. Type: sysdm.cpl  and press Enter
    echo    3. Advanced tab ^> Environment Variables
    echo    4. Under "System variables" find "Path" ^> Edit
    echo    5. Add: C:\Program Files\nodejs
    echo    6. Click OK, restart computer, run this script again
    echo.
    pause & exit /b 1
)

for /f "tokens=*" %%v in ('node --version') do set NV=%%v
for /f "tokens=*" %%v in ('npm --version')  do set NPMV=%%v
echo  [OK] Node.js %NV%
echo  [OK] npm v%NPMV%
echo.

echo  [1/3] Installing dependencies (first time takes ~2 min)...
echo        Please wait, do not close this window...
echo.
call npm install 2>&1
if %errorlevel% neq 0 (
    echo.
    echo  [ERROR] npm install failed.
    echo  Check your internet connection and try again.
    echo.
    pause & exit /b 1
)
echo.
echo  [OK] Dependencies installed
echo.

echo  [2/3] Building app...
echo        This packages everything into a standalone .exe
echo        (takes 2-5 minutes, please wait)
echo.
call npm run pack 2>&1
if %errorlevel% neq 0 (
    echo.
    echo  [ERROR] Build failed. See error above.
    echo.
    pause & exit /b 1
)

echo.
echo  [OK] Build complete!
echo.
echo  ============================================================
echo  [3/3] YOUR APP IS READY:
echo.
echo   Location: dist\HAKAI Wallpaper Engine-win32-x64\
echo.
echo   HOW TO USE:
echo    1. Open the dist\HAKAI Wallpaper Engine-win32-x64\ folder
echo    2. Double-click "HAKAI Wallpaper Engine.exe" to run it
echo.
echo   MAKE A DESKTOP SHORTCUT:
echo    Right-click "HAKAI Wallpaper Engine.exe"
echo    ^> Send to ^> Desktop (create shortcut)
echo    Now you can double-click it from your Desktop anytime!
echo.
echo   AUTO-START WITH WINDOWS:
echo    Open the app ^> Settings panel (right side)
echo    ^> Toggle "Start with Windows" ON
echo  ============================================================
echo.

:: Open the output folder automatically
if exist "dist\HAKAI Wallpaper Engine-win32-x64\" (
    explorer "dist\HAKAI Wallpaper Engine-win32-x64"
)

pause
