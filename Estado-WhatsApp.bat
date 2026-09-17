@echo off
chcp 65001 >nul
title Kindev Meta Ads — Estado de Servidor y WhatsApp
color 0B
cls

set PROJECT_DIR=%~dp0
cd /d "%PROJECT_DIR%"

:MENU
cls
echo ===================================================================
echo     KINDEV S.A.S. - CONTROL DEL SERVIDOR WHATSAPP Y META CAPI
echo ===================================================================
echo.
echo [Comprobando estado del puerto 3000...]
powershell -NoProfile -Command "$conn = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue; if ($conn) { Write-Host ' ESTADO: ACTIVO Y ESCUCHANDO EN PUERTO 3000' -ForegroundColor Green; Write-Host (' PID: ' + $conn.OwningProcess) } else { Write-Host ' ESTADO: DETENIDO (No esta activo)' -ForegroundColor Yellow }"

echo.
echo -------------------------------------------------------------------
echo  [1] Iniciar servidor en segundo plano
echo  [2] Abrir Panel de Ventas (Firebase Cloud)
echo  [3] Abrir Escaner de Codigo QR (WhatsApp Web)
echo  [4] Ver ultimos registros (Logs de conexion)
echo  [5] Reiniciar servidor
echo  [6] Detener servidor
echo  [7] Salir
echo -------------------------------------------------------------------
echo.
set /p OPCION="Selecciona una opcion (1-7): "

if "%OPCION%"=="1" goto INICIAR
if "%OPCION%"=="2" goto ABRIR_WEB
if "%OPCION%"=="3" goto ABRIR_QR
if "%OPCION%"=="4" goto VER_LOGS
if "%OPCION%"=="5" goto REINICIAR
if "%OPCION%"=="6" goto DETENER
if "%OPCION%"=="7" goto SALIR
goto MENU

:INICIAR
wscript.exe "%PROJECT_DIR%bin\start-silent.vbs"
echo.
echo [OK] Servidor iniciado silenciosamente en segundo plano.
timeout /t 2 >nul
goto MENU

:ABRIR_WEB
start https://kindevmetaads.web.app
goto MENU

:ABRIR_QR
start http://localhost:3000/qr
goto MENU

:VER_LOGS
cls
echo ==================== ULTIMOS LOGS ====================
if exist "logs\server.log" (
    powershell -NoProfile -Command "Get-Content -Path 'logs\server.log' -Tail 25"
) else (
    echo No hay archivo de logs reciente.
)
echo =====================================================
echo.
pause
goto MENU

:REINICIAR
echo Deteniendo instancias de Node en puerto 3000...
powershell -NoProfile -Command "$conns = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue; foreach ($c in $conns) { Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue }"
timeout /t 1 >nul
wscript.exe "%PROJECT_DIR%bin\start-silent.vbs"
echo [OK] Servidor reiniciado.
timeout /t 2 >nul
goto MENU

:DETENER
echo Deteniendo servidor...
powershell -NoProfile -Command "$conns = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue; foreach ($c in $conns) { Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue }"
echo [OK] Servidor detenido.
timeout /t 2 >nul
goto MENU

:SALIR
exit
