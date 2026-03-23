Set WshShell = CreateObject("WScript.Shell")
Set FSO = CreateObject("Scripting.FileSystemObject")

' 1. Comprobar si el servidor ya esta corriendo en el puerto 3000
strCommand = "cmd /c netstat -ano | find ""LISTENING"" | find "":3000"""
Set objExec = WshShell.Exec(strCommand)
strOutput = objExec.StdOut.ReadAll()

If InStr(strOutput, ":3000") = 0 Then
    ' El puerto esta libre, asi que iniciamos el servidor oculto
    nodePath = "node"
    If FSO.FileExists("C:\Program Files\nodejs\node.exe") Then
        nodePath = """C:\Program Files\nodejs\node.exe"""
    End If

    ' Ejecuta el entorno ocultando la ventana de comandos (0=oculto)
    WshShell.Run "cmd /c " & nodePath & " node_modules\next\dist\bin\next dev -H 127.0.0.1 -p 3000", 0, False

    ' Espera 5 segundos para darle tiempo al servidor de iniciar
    WScript.Sleep 5000
End If

' 2. Abre el navegador Google Chrome como aplicacion
WshShell.Run "chrome http://127.0.0.1:3000 --app=http://127.0.0.1:3000", 1, False
