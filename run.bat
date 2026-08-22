@echo off
chcp 65001 >nul
echo =========================================
echo Omaju Development Server Starting...
echo =========================================
echo.

node scripts/show-ip.cjs

echo Starting server and opening browser...
npm run dev -- --host --open
pause
