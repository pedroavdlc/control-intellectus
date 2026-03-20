@echo off
echo ========================================================
echo   Creando icono de Intellectus en tu Escritorio...
echo ========================================================
echo.

:: Obtener la ruta exacta de donde esta este archivo
set "SCRIPT_DIR=%~dp0"
set "SHORTCUT_PATH=%USERPROFILE%\Desktop\Abrir Intellectus.lnk"

:: Usar PowerShell para crear un acceso directo compatible con la barra de tareas
powershell -Command "$wshell = New-Object -ComObject WScript.Shell; $shortcut = $wshell.CreateShortcut('%SHORTCUT_PATH%'); $shortcut.TargetPath = 'cmd.exe'; $shortcut.Arguments = '/c \"\"%SCRIPT_DIR%iniciar.bat\"\"'; $shortcut.WorkingDirectory = '%SCRIPT_DIR%'; $shortcut.IconLocation = 'shell32.dll,13'; $shortcut.Save()"

echo ¡Listo! Se ha creado un icono llamado "Abrir Intellectus" en tu Escritorio.
echo.
echo Ahora solo ve a tu Escritorio, hazle click derecho al icono y dale a "Anclar a la barra de tareas".
echo.
pause
