@echo off
echo [SpeakMate] Stopping all running servers...

:: Use PowerShell to find and kill processes on ports 3000 and 3001
powershell -Command "Get-NetTCPConnection -LocalPort 3000,3001 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Write-Host ('Killing PID ' + $_.OwningProcess + ' on port ' + $_.LocalPort); Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"

echo [SpeakMate] All servers stopped!
pause
