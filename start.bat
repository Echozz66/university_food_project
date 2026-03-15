@echo off
cd /d "%~dp0"
echo Starting server...
echo.

cd backend
start "Backend" cmd /k "node server.js"

timeout /t 2 /nobreak >nul

echo.
echo Backend running at http://localhost:3000
echo.
echo Please open this file in browser:
echo %~dp0frontend\index.html
echo.
echo Or use VS Code Live Server.
pause
