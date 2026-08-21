@echo off
setlocal
title Stop Tenon
set PORT=3100
echo Stopping Tenon on port %PORT% ...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr /r /c:":%PORT% .*LISTENING"') do taskkill /pid %%a /t /f >nul 2>&1
echo Stopped.
timeout /t 2 /nobreak >nul
