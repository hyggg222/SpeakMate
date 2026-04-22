# SpeakMate Stop Script (KEEP WINDOWS ALIVE)

Write-Host "--- [SpeakMate] Stopping All Services ---" -ForegroundColor Yellow

# 1. Signal wrappers to stop restarting
$SignalDir = Join-Path "$PSScriptRoot\.." ".signals"
if (!(Test-Path $SignalDir)) { New-Item -ItemType Directory -Path $SignalDir -Force | Out-Null }
# Remove start signals so wrappers don't restart
Remove-Item (Join-Path $SignalDir ".start_*") -Force -ErrorAction SilentlyContinue

# 2. Kill processes on specific ports (catches all child processes including Turbopack Rust binaries)
$ports = @(3000, 3001)
$tcpConnections = Get-NetTCPConnection -LocalPort $ports -State Listen -ErrorAction SilentlyContinue
if ($tcpConnections) {
    # Get unique PIDs
    $pidsToKill = $tcpConnections.OwningProcess | Select-Object -Unique
    foreach ($procId in $pidsToKill) {
        if ($procId -and $procId -ne 0) {
            Write-Host "Killing PID $procId holding one of the ports ($($ports -join ','))" -ForegroundColor Red
            Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
            taskkill /F /PID $procId /T 2>$null | Out-Null
        }
    }
}
else {
    Write-Host "No processes listening on ports $($ports -join ',')." -ForegroundColor Green
}

# 3. Wait briefly then verify ports are free
Start-Sleep -Seconds 1

# 4. Kill any remaining node.exe that might have survived
$nodeProcs = Get-Process -Name "node" -ErrorAction SilentlyContinue
if ($nodeProcs) {
    Write-Host "Cleaning up $($nodeProcs.Count) remaining node processes..." -ForegroundColor Red
    $nodeProcs | Stop-Process -Force -ErrorAction SilentlyContinue
}

# 5. Kill python if needed
Get-Process -Name "python" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

Write-Host "All processes STOPPED." -ForegroundColor Yellow
