@echo off
setlocal

:: Lấy thư mục chứa script
set "SCRIPT_DIR=%~dp0"
set "ROOT_DIR=%SCRIPT_DIR%.."

echo =======================================
echo SpeakMate SSoT AI Environment Setup
echo =======================================

:: Setup Claude directory data junction path
set "CLAUDE_TARGET_DIR=C:\Users\DELL GAMING G15 5511\.claude\projects\d--SpeakMate"
set "PROJECT_DATA_DIR=%ROOT_DIR%\.ai-data\claude-project"

if not exist "%PROJECT_DATA_DIR%" (
    mkdir "%PROJECT_DATA_DIR%"
)
if not exist "C:\Users\DELL GAMING G15 5511\.claude\projects" (
    mkdir "C:\Users\DELL GAMING G15 5511\.claude\projects"
)

:: Kiểm tra junction đã tồn tại
cd /d "C:\Users\DELL GAMING G15 5511\.claude\projects"
fsutil reparsepoint query "d--SpeakMate" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo Claude directory junction already exists.
) else (
    if exist "%CLAUDE_TARGET_DIR%" (
        echo Moving existing Claude memory...
        robocopy "%CLAUDE_TARGET_DIR%" "%PROJECT_DATA_DIR%" /E /MOVE > nul
    )
    echo Creating Directory Junction...
    mklink /J "%CLAUDE_TARGET_DIR%" "%PROJECT_DATA_DIR%"
    if %ERRORLEVEL% EQU 0 (
        echo [OK] Successfully created Claude Code directory junction!
    ) else (
        echo [FAILED] Failed to create junction. Try running as Administrator.
    )
)

:: Run initial sync
echo.
echo Running AI Context sync...
cd /d "%ROOT_DIR%"
node ".ai\sync.js"
echo.
echo Setup complete!
