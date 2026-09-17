$projectDir = "C:\Users\mkmcm\AA Miyako\DevEC\META"
Set-Location $projectDir

$starter = Join-Path $projectDir "bin\start-service.ps1"
& $starter

# If it just started, wait a brief moment
Start-Sleep -Milliseconds 800

# Open Dashboard in default browser
Start-Process "https://kindevmetaads.web.app"
