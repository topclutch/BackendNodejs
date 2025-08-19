@echo off
echo 🚀 Iniciando Backend 1 (Node.js + MongoDB)...
cd /d "%~dp0..\backend1"
echo 📂 Directorio actual: %CD%
echo.
if not exist ".env" (
    echo ❌ Archivo .env no encontrado
    echo 🔧 Ejecuta fix_jwt_secrets.bat primero
    pause
    exit /b 1
)
echo 📋 Contenido del .env:
type .env
echo.
echo 🔄 Iniciando servidor...
npm start
