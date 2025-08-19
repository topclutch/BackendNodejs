@echo off
echo 🚀 Iniciando Backend 2 (Flask + MySQL)...
cd /d "%~dp0..\backend2"
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
python app.py
