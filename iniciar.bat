@echo off
echo ========================================================
echo   Iniciando Proyecto Intellectus...
echo ========================================================
echo Por favor, NO cierres esta ventana negra mientras uses el programa.
echo.

set "NODE_CMD=node"
where node >nul 2>nul
if %errorlevel% neq 0 (
    if exist "C:\Program Files\nodejs\node.exe" (
        set "NODE_CMD=C:\Program Files\nodejs\node.exe"
    ) else (
        echo ERROR: No se encontro Node.js en el sistema.
        echo Por favor instala Node.js antes de continuar.
        pause
        exit /b
    )
)

echo El programa se abrira magicamente en tu navegador en unos segundos...
echo.

:: Espera 3 segundos y luego abre el navegador web por defecto saltando el VPN
timeout /t 3 >nul
start http://127.0.0.1:3000

:: Inicia el servidor directamente con node para evitar el bug de npm corrupto
"%NODE_CMD%" node_modules\next\dist\bin\next dev -H 127.0.0.1 -p 3000

pause
