@echo off
title HAKAI Wallpaper Engine
cd /d "%~dp0"

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo Node.js not found. Get it from https://nodejs.org
    pause & exit /b 1
)

if not exist "node_modules\electron" (
    echo First run — installing (takes ~1 min)...
    call npm install
)

echo Starting HAKAI Wallpaper Engine...
npm start
