Set WshShell = CreateObject("WScript.Shell")
' Se ejecuta el entorno de la aplicación ocultando la ventana de comandos (0=oculto)
WshShell.Run "cmd /c npm run dev", 0, False

' Se espera 5 segundos para darle tiempo al servidor de iniciar
WScript.Sleep 5000

' Se abre el navegador Google Chrome con la IP local de forma normal (1=visible)
WshShell.Run "chrome http://localhost:3000 --app=http://localhost:3000", 1, False
