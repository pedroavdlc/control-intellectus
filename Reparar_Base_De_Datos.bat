@echo off
color 0B
echo ========================================================
echo   Herramienta de Reparacion Automatica - Intellectus
echo ========================================================
echo.
echo Cerrando cualquier proceso bloqueado o escondido...
taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM cmd.exe /FI "WINDOWTITLE ne %~nx0" >nul 2>&1
echo.
echo Reparando el motor de Base de Datos para ESTA computadora...
call npx prisma generate
echo.
echo Limpiando cache del sistema...
rmdir /s /q .next >nul 2>&1
echo.
echo Reconstruyendo el programa... (Esto tomara 1 minuto)
call npm run build
echo.
echo ========================================================
echo REPARACION COMPLETA. ¡El sistema esta listo!
echo ========================================================
echo Ya puedes cerrar esta ventana y darle doble clic a "iniciar.bat"
pause
