@echo off
echo ========================================================
echo   Iniciando Proyecto Intellectus...
echo ========================================================
echo Por favor, NO cierres esta ventana negra mientras uses el programa.
echo.
echo El programa se abrira magicamente en tu navegador en unos segundos...
echo.

:: Espera 3 segundos y luego abre el navegador web por defecto saltando el VPN
timeout /t 3 >nul
start http://127.0.0.1:3000

:: Inicia el servidor de Next.js anclado al anillo local para que el VPN no lo detecte
call npm run start -- -H 127.0.0.1 -p 3000

pause
