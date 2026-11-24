@echo off
title CampusVoice Assistant Server
cd /d "%~dp0"
echo ========================================================
echo   Starting CampusVoice Voice Assistant ^& Web Portal...
echo   Web UI: http://127.0.0.1:8000
echo   Docs:   http://127.0.0.1:8000/docs
echo ========================================================

where python >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    python run_server.py
) else if exist "%LOCALAPPDATA%\Programs\Python\Python313\python.exe" (
    "%LOCALAPPDATA%\Programs\Python\Python313\python.exe" run_server.py
) else if exist "%LOCALAPPDATA%\Programs\Python\Python312\python.exe" (
    "%LOCALAPPDATA%\Programs\Python\Python312\python.exe" run_server.py
) else (
    echo [ERROR] Python not found in PATH or standard installation directory.
    pause
)
pause
