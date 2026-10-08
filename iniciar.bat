@echo off
REM Inicia backend + frontal en http://localhost:3000
cd /d "%~dp0backend"
where node >nul 2>nul
if errorlevel 1 (
  echo No se encontro Node.js. Ejecuta instalar-node.bat primero.
  pause
  exit /b 1
)
node server.js --port=3000
pause
