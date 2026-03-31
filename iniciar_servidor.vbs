Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "python -m http.server 8080 --directory ""C:\Users\mateu\Desktop\voltcity2026""", 0, False
WScript.Echo "Volt City servidor iniciado! Acesse: http://100.76.18.6:8080/nutricity_panel.html"
