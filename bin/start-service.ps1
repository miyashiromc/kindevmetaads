$projectDir = "C:\Users\mkmcm\AA Miyako\DevEC\META"
Set-Location $projectDir

$logDir = Join-Path $projectDir "logs"
if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
}

$logFile = Join-Path $logDir "server.log"
$errFile = Join-Path $logDir "server_err.log"

$listening = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue

if (-not $listening) {
    Start-Process -FilePath "node" `
        -ArgumentList "server.js" `
        -WorkingDirectory $projectDir `
        -WindowStyle Hidden `
        -RedirectStandardOutput $logFile `
        -RedirectStandardError $errFile
}
