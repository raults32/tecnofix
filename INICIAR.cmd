@echo off
cd /d "%~dp0"
echo Abra http://127.0.0.1:3000 en su navegador.
echo Para detener el servidor presione Ctrl+C.
node src/server.js
pause
