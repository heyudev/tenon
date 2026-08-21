@echo off
setlocal
title Tenon
cd /d "%~dp0"
set PORT=3100
set URL=http://localhost:%PORT%
set APPPATHS=HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths

rem already running -- just open the window
netstat -ano | findstr /r /c:":%PORT% .*LISTENING" >nul 2>&1
if not errorlevel 1 goto :open

if not exist "node_modules" call npm install

rem production build if present (fast), else dev
if not exist ".next\BUILD_ID" goto :devmode
echo Starting Tenon...
start "tenon-server" /min cmd /c "npm start"
goto :wait
:devmode
echo Starting Tenon (dev mode)...
start "tenon-server" /min cmd /c "npm run dev"

:wait
set /a TRIES=0
:waitloop
set /a TRIES+=1
if %TRIES% gtr 60 goto :timeout
timeout /t 1 /nobreak >nul
netstat -ano | findstr /r /c:":%PORT% .*LISTENING" >nul 2>&1
if errorlevel 1 goto :waitloop

rem chromeless app window -- Chrome preferred, Edge as fallback
:open
reg query "%APPPATHS%\chrome.exe" >nul 2>&1
if not errorlevel 1 goto :usechrome
reg query "%APPPATHS%\msedge.exe" >nul 2>&1
if not errorlevel 1 goto :useedge
start "" %URL%
goto :eof
:usechrome
start "" chrome --app=%URL%
goto :eof
:useedge
start "" msedge --app=%URL%
goto :eof

:timeout
echo.
echo Startup timed out. Run "npm start" here to see the error.
pause
