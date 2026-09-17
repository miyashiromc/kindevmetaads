$desktopPath = [Environment]::GetFolderPath('Desktop')
$startupPath = [Environment]::GetFolderPath('Startup')
$wsh = New-Object -ComObject WScript.Shell

# 1. Desktop Shortcut
$desktopLnkPath = Join-Path $desktopPath 'Kindev Meta Ads.lnk'
$desktopShortcut = $wsh.CreateShortcut($desktopLnkPath)
$desktopShortcut.TargetPath = 'wscript.exe'
$desktopShortcut.Arguments = '"""C:\Users\mkmcm\AA Miyako\DevEC\META\bin\open-dashboard.vbs"""'
$desktopShortcut.WorkingDirectory = 'C:\Users\mkmcm\AA Miyako\DevEC\META'
$desktopShortcut.IconLocation = 'C:\Users\mkmcm\AA Miyako\DevEC\META\public\favicon.ico'
$desktopShortcut.Description = 'Kindev Meta Ads & WhatsApp Gateway'
$desktopShortcut.Save()
Write-Output "Desktop shortcut created: $desktopLnkPath"

# 2. Windows Startup Shortcut
$startupLnkPath = Join-Path $startupPath 'Kindev WhatsApp Service.lnk'
$startupShortcut = $wsh.CreateShortcut($startupLnkPath)
$startupShortcut.TargetPath = 'wscript.exe'
$startupShortcut.Arguments = '"""C:\Users\mkmcm\AA Miyako\DevEC\META\bin\start-silent.vbs"""'
$startupShortcut.WorkingDirectory = 'C:\Users\mkmcm\AA Miyako\DevEC\META'
$startupShortcut.IconLocation = 'C:\Users\mkmcm\AA Miyako\DevEC\META\public\favicon.ico'
$startupShortcut.Description = 'Kindev WhatsApp Gateway Auto-Startup Service'
$startupShortcut.Save()
Write-Output "Startup shortcut created: $startupLnkPath"
