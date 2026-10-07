@echo off
cd /d "%~dp0"
echo Starting AI Interview Platform...
start "AI Interview Backend" cmd /k "cd /d ""%~dp0"" && npm.cmd run start:dev --workspace=backend"
start "AI Interview Frontend" cmd /k "cd /d ""%~dp0"" && npm.cmd run dev --workspace=frontend"
echo.
echo Backend: http://localhost:4000/api/v1
echo Swagger: http://localhost:4000/api/docs
echo Frontend: http://localhost:3000
echo.
echo Two terminal windows were opened. Keep both running.
pause
