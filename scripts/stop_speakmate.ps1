# SpeakMate Stop Script (PURGE ALL CUDA & SERVICES)

Write-Host "--- [SpeakMate] Stopping All Services & Cleaning VRAM ---" -ForegroundColor Yellow

# Kill all python.exe (STT/TTS)
Write-Host "Stopping Python Services..." -ForegroundColor Red
taskkill /F /IM python.exe /T 2>$null

# Kill all node.exe (Backend/Frontend)
Write-Host "Stopping Node Services..." -ForegroundColor Red
taskkill /F /IM node.exe /T 2>$null

# Kill Ollama just in case it was running
Write-Host "Stopping Ollama (if any)..." -ForegroundColor Red
taskkill /F /IM ollama.exe /IM ollama_llama_server.exe /T 2>$null

# 4. Close Identified Terminal Windows
Write-Host "Closing SpeakMate Terminal Windows..." -ForegroundColor Cyan
Get-Process powershell | Where-Object { $_.MainWindowTitle -like "SpeakMate_*" } | Stop-Process -Force -ErrorAction SilentlyContinue

Write-Host "All systems STOPPED successfully." -ForegroundColor Yellow
