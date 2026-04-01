@echo off
echo [SpeakMate] Starting Backend and Frontend...

:: Start Backend in a new window
start "SpeakMate Backend" cmd /k "cd backend && npm run dev"

:: Start Frontend in a new window
start "SpeakMate Frontend" cmd /k "cd frontend && npm run dev"

echo [SpeakMate] Processes launched in separate windows!
exit
