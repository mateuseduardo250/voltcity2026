@echo off
title Volt City — Sincronizando...
color 0A
echo.
echo  ========================================
echo    VOLT CITY — Sincronizando
echo  ========================================
echo.

echo  [1/3] Baixando atualizacoes do GitHub...
cd /d "C:\Users\mateu\Desktop\voltcity2026"
git pull origin main
echo.

echo  [2/3] Copiando arquivos para o Poste 1...
scp "C:\Users\mateu\Desktop\voltcity2026\nutricity_panel.html" pi@100.69.187.24:/home/pi/voltcity_panel/
scp -r "C:\Users\mateu\Desktop\voltcity2026\css" pi@100.69.187.24:/home/pi/voltcity_panel/
scp -r "C:\Users\mateu\Desktop\voltcity2026\js" pi@100.69.187.24:/home/pi/voltcity_panel/
echo.

echo  [3/3] Reiniciando servidor no Poste 1...
ssh pi@100.69.187.24 "sudo systemctl restart voltcity-panel"
echo.

echo  ========================================
echo    PRONTO! App atualizado com sucesso.
echo    Acesse: http://100.69.187.24:8080/nutricity_panel.html
echo  ========================================
echo.
pause
