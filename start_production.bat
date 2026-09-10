@echo off
echo =======================================================
echo    RAILSYNC: AI-Assisted Railway Possession Planning   
echo    Network Operations Center (NOC) Production Starter  
echo =======================================================

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is required but not installed.
    exit /b 1
)

where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Python is required but not installed.
    exit /b 1
)

set PYTHONPATH=%cd%
set PORT=3000

if not exist dist (
    echo [1/2] Building frontend bundle...
    call npm run build
)

echo [2/2] Starting RailSync unified server on port 3000...
node dist/server.cjs
