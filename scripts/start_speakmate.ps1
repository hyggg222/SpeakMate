# SpeakMate Start Script (OOM-FREE PIPELINE)
# Logic: STT (Local/CPU) -> Gemini (Cloud) -> F5-TTS (Local/GPU)

Write-Host "--- [SpeakMate] Starting All Services ---" -ForegroundColor Cyan

# 1. Start STT (DISABLED - Offloaded to Modal Cloud)
# Write-Host "1. [OFFLOADED] STT Service is now in Cloud" -ForegroundColor Cyan

# 2. Start TTS (DISABLED - Offloaded to Modal Cloud)
# Write-Host "2. [OFFLOADED] TTS Service is now in Cloud" -ForegroundColor Cyan

# 3. Start Backend Orchestrator (Gemini Integration)
Write-Host "3. Starting Backend Orchestrator (Port 3001)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$host.ui.RawUI.WindowTitle = 'SpeakMate_Backend'; cd '$PSScriptRoot\..\backend'; npm run dev" -WindowStyle Normal

# 4. Start Frontend
Write-Host "4. Starting Frontend (Port 3000)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$host.ui.RawUI.WindowTitle = 'SpeakMate_Frontend'; cd '$PSScriptRoot\..\frontend'; npm run dev" -WindowStyle Normal

Write-Host "Done! Please wait a moment for models to load." -ForegroundColor Cyan
