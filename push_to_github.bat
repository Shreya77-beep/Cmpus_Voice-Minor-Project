@echo off
setlocal
cd /d "%~dp0"
set "PATH=C:\Users\SHREYA GHOSHAL\AppData\Local\Microsoft\WinGet\Packages\Git.MinGit_Microsoft.Winget.Source_8wekyb3d8bbwe\cmd;C:\Users\SHREYA GHOSHAL\AppData\Local\Microsoft\WinGet\Packages\Git.MinGit_Microsoft.Winget.Source_8wekyb3d8bbwe\ucrt64\bin;%PATH%"

echo ===================================================
echo   CampusVoice - Push Codebase to GitHub
echo ===================================================
echo Target Remote: https://github.com/pinaki-bit/Campus_Voice.git
echo Current Branch: main
echo.

git status

echo.
echo Pushing to GitHub...
git push -u origin main

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ---------------------------------------------------
    echo Push paused. If GitHub requires authentication:
    echo 1. Generate a Personal Access Token (PAT) at:
    echo    https://github.com/settings/tokens (Select 'repo' scope)
    echo 2. Enter your Personal Access Token below:
    echo ---------------------------------------------------
    set /p GITHUB_TOKEN="Enter GitHub Personal Access Token (or press Enter to exit): "
    if not "!GITHUB_TOKEN!"=="" (
        git push -u https://!GITHUB_TOKEN!@github.com/pinaki-bit/Campus_Voice.git main
    )
)

echo.
echo Done. Press any key to exit.
pause >nul
