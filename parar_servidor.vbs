Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "taskkill /F /IM python.exe", 0, True
WScript.Echo "Volt City servidor parado."
