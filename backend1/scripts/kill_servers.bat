@echo off
echo 🛑 Deteniendo servidores en puertos 3001 y 5000...

REM Matar procesos en puerto 3001 (Backend 1)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3001') do (
    echo Matando proceso %%a en puerto 3001
    taskkill /f /pid %%a >nul 2>&1
)

REM Matar procesos en puerto 5000 (Backend 2)  
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5000') do (
    echo Matando proceso %%a en puerto 5000
    taskkill /f /pid %%a >nul 2>&1
)

echo ✅ Servidores detenidos
echo 🚀 Ahora puedes reiniciar los backends
pause
