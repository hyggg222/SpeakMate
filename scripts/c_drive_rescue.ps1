$TEMP_PATH = "D:\AI_Temp"
$PIP_CACHE = "D:\AI_Temp\pip_cache"

# Create directories if they don't exist
if (!(Test-Path $TEMP_PATH)) { New-Item -ItemType Directory -Force -Path $TEMP_PATH }
if (!(Test-Path $PIP_CACHE)) { New-Item -ItemType Directory -Force -Path $PIP_CACHE }

# Override Environment Variables for current session to SAVE DRIVE C:
$env:TEMP = $TEMP_PATH
$env:TMP = $TEMP_PATH
$env:PIP_CACHE_DIR = $PIP_CACHE

Write-Host ">>> [SAVING C: DRIVE] Redirected TEMP/TMP/PIP_CACHE to D:\AI_Temp" -ForegroundColor Green

# Activate venv
if (Test-Path "D:\SpeakMate\venv\Scripts\Activate.ps1") {
    . "D:\SpeakMate\venv\Scripts\Activate.ps1"
    Write-Host ">>> [VENV] Environment Activated." -ForegroundColor Cyan
} else {
    Write-Host ">>> [ERROR] Venv NOT found at D:\SpeakMate\venv" -ForegroundColor Red
}

# INSTALL TORCH 2.5.1+CU121 correctly to match torchaudio
# (Using --cache-dir $PIP_CACHE to be absolutely sure)
# Command: pip install torch==2.5.1+cu121 torchaudio==2.5.1+cu121 --index-url https://download.pytorch.org/whl/cu121 --cache-dir D:\AI_Temp\pip_cache --no-warn-script-location --force-reinstall
