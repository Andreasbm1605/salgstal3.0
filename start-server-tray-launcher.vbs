Set objShell = CreateObject("WScript.Shell")

' Get the directory where this VBS file is located
currentDir = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)

' Run PowerShell script completely hidden (no window, no taskbar)
objShell.Run "powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -File """ & currentDir & "\start-server.ps1""", 0, False
