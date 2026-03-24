@echo off
setlocal EnableDelayedExpansion

echo ========================================================
echo   Instalador del Proyecto Intellectus
echo ========================================================
echo.

:: === DETECCION AUTOMATICA ===
:: %~dp0 = la carpeta donde vive este mismo archivo .bat
set "PROGRAM_DIR=%~dp0"
:: Quitar la barra final
if "%PROGRAM_DIR:~-1%"=="\" set "PROGRAM_DIR=%PROGRAM_DIR:~0,-1%"

:: La carpeta de archivos ahora está embebida y optimizada.
echo  Programa detectado en: %PROGRAM_DIR%
echo  Archivos se guardan en: %PROGRAM_DIR%\storage
echo.

echo IMPORTANTE: Asegurate de tener Node.js instalado.
echo Si no lo tienes, descargalo de https://nodejs.org
echo Presiona cualquier tecla cuando estes listo...
pause >nul

echo.
echo ========================================================

set "NPM_CMD=npm"
set "NPX_CMD=npx"
where npm >nul 2>nul
if %errorlevel% neq 0 (
    if exist "C:\Program Files\nodejs\npm.cmd" (
        set "NPM_CMD=C:\Program Files\nodejs\npm.cmd"
        set "NPX_CMD=C:\Program Files\nodejs\npx.cmd"
    ) else (
        echo ERROR: Node.js no esta en la ruta y no se encontro en el disco C.
        pause
        exit /b
    )
)

echo [1/3] Instalando dependencias...
cd /d "%PROGRAM_DIR%"
call "%NPM_CMD%" install

echo.
echo [2/3] Configurando base de datos...
call "%NPX_CMD%" prisma generate
call "%NPX_CMD%" prisma db push

echo.
echo [3/3] Compilando el programa...
call "%NPM_CMD%" run build

echo.
echo ========================================================
echo   Instalacion completada con exito!
echo ========================================================
echo.
echo  Programa:  %PROGRAM_DIR%
echo  Archivos:  %PROGRAM_DIR%\storage
echo.
echo  - Usa "iniciar.bat" para arrancar el programa.
echo  - Usa "Crear_Acceso_Directo.bat" para anclarlo a la barra de tareas.
echo.
pause
endlocal

