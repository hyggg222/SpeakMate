# SpeakMate Start Script (PERSISTENT WINDOWS)
# Logic: Kiểm tra wrapper còn sống bằng Named Mutex (không dùng PID/WMI).
# Nếu chưa có: mở cửa sổ mới chạy service_wrapper.ps1.
# Nếu đã có: chỉ đặt signal file để trigger wrapper.

Write-Host "--- [SpeakMate] Starting All Services ---" -ForegroundColor Cyan

$SignalDir = Join-Path "$PSScriptRoot\.." ".signals"
if (!(Test-Path $SignalDir)) { New-Item -ItemType Directory -Path $SignalDir -Force | Out-Null }

function Start-Service-With-Wrapper {
    param($Name, $Dir, $Cmd)

    $SignalFile = Join-Path $SignalDir ".start_$Name"
    $mutexName = "SpeakMate_${Name}_Wrapper"

    # Kiểm tra wrapper còn sống bằng Named Mutex
    $existingMutex = $null
    $IsRunning = [System.Threading.Mutex]::TryOpenExisting($mutexName, [ref]$existingMutex)
    if ($IsRunning) { $existingMutex.Close() }

    # Đặt signal file để kích hoạt
    New-Item -Path $SignalFile -ItemType File -Force | Out-Null

    if (-not $IsRunning) {
        Write-Host "Service $($Name): Opening new window..." -ForegroundColor Gray
        $WrapperPath = Join-Path $PSScriptRoot "service_wrapper.ps1"
        Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-Command", "& { & '$WrapperPath' -ServiceName '$Name' -WorkingDirectory '$Dir' -Command '$Cmd' }"
    }
    else {
        Write-Host "Service $($Name): Reusing window." -ForegroundColor Gray
    }
}

# 1. Start Backend (Port 3001)
Write-Host "1. Starting Backend..." -ForegroundColor Green
Start-Service-With-Wrapper -Name "Backend" -Dir "$PSScriptRoot\..\backend" -Cmd "npm run dev"

# 2. Start Frontend (Port 3000)
Write-Host "2. Starting Frontend..." -ForegroundColor Green
Start-Service-With-Wrapper -Name "Frontend" -Dir "$PSScriptRoot\..\frontend" -Cmd "npm run dev"

Write-Host "Done! Services are being triggered in their respective windows." -ForegroundColor Cyan
