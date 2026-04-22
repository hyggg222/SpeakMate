param (
    [string]$ServiceName,
    [string]$WorkingDirectory,
    [string]$Command
)

# Đặt tiêu đề cửa sổ
try { $host.ui.RawUI.WindowTitle = "SpeakMate_$ServiceName" } catch {}

$SignalDir = Join-Path "$PSScriptRoot\.." ".signals"
if (!(Test-Path $SignalDir)) { New-Item -ItemType Directory -Path $SignalDir -Force | Out-Null }
$SignalFile = Join-Path $SignalDir ".start_$ServiceName"

# Tạo Named Mutex để nhận diện (tự hủy khi process chết, không cần file lock)
$mutexName = "SpeakMate_${ServiceName}_Wrapper"
$mutex = New-Object System.Threading.Mutex($true, $mutexName)

Write-Host "--- [SpeakMate] Window Wrapper for $ServiceName (PID: $PID) ---" -ForegroundColor Cyan
Write-Host "Window is ready and waiting for start signal..." -ForegroundColor Gray
Write-Host "(Run run-all.bat to start the service inside this window)" -ForegroundColor Gray

try {
    while ($true) {
        if (Test-Path $SignalFile) {
            Remove-Item $SignalFile -ErrorAction SilentlyContinue

            Write-Host "`n>>> Starting $ServiceName at $(Get-Date -Format 'HH:mm:ss')..." -ForegroundColor Green
            Set-Location $WorkingDirectory

            Invoke-Expression $Command

            Write-Host "`n<<< $ServiceName stopped. Waiting for next signal..." -ForegroundColor Yellow
        }
        Start-Sleep -Milliseconds 500
    }
}
finally {
    try { $mutex.ReleaseMutex() } catch {}
    $mutex.Dispose()
}
