@echo off
setlocal
cd /d "%~dp0"
echo.
echo === AI Interview Platform - Windows Setup ===
echo.
where node >nul 2>nul || (echo ERROR: Node.js is not installed or not in PATH.& pause & exit /b 1)
where npm.cmd >nul 2>nul || (echo ERROR: npm is not available.& pause & exit /b 1)
where psql >nul 2>nul || echo WARNING: psql is not in PATH. PostgreSQL must be installed and running.

echo [1/5] Installing dependencies...
call npm.cmd install
if errorlevel 1 goto :fail

echo [2/5] Generating Prisma client...
call npx.cmd prisma generate --schema=prisma/schema.prisma
if errorlevel 1 goto :fail

echo [3/5] Creating/updating database tables...
call npx.cmd prisma db push --schema=prisma/schema.prisma
if errorlevel 1 goto :fail

echo [4/5] Seeding database...
call npm.cmd run prisma:seed --workspace=backend
if errorlevel 1 goto :fail

echo [5/5] Setup complete.
echo.
echo Admin login: admin@aiinterview.dev
 echo Password: ChangeMe123!
echo.
echo Run start-windows.cmd to start backend and frontend.
pause
exit /b 0
:fail
echo.
echo SETUP FAILED. Copy the error above into ChatGPT and I can fix the exact step.
pause
exit /b 1
