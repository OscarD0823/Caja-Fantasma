@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
if not exist "node_modules" (
  echo Instala primero las dependencias con pnpm install.
  pause
  exit /b 1
)
node node_modules\@tauri-apps\cli\tauri.js dev
if errorlevel 1 pause
