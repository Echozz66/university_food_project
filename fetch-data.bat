@echo off
cd /d "%~dp0"
echo ========================================
echo Fetching nearby restaurants data
echo ========================================
echo.

cd backend

echo Running data fetch script...
node scripts/fetchRestaurants.js

echo.
pause
