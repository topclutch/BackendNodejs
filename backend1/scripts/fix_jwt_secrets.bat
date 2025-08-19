@echo off
chcp 65001 >nul
echo 🔧 Solucionando JWT_SECRET en ambos backends...

REM === JWT_SECRET sin comillas ===
set JWT_SECRET=JlpGNqdI-mt4tPavhvUAerYNUcvlOj8lR0Oy-1OzsHU

echo 📝 Creando backend1/.env...
(
echo # Configuración del servidor
echo PORT=3001
echo NODE_ENV=development
echo CLIENT_URL=http://localhost:5173
echo BACKEND2_URL=http://localhost:5000
echo.
echo # MongoDB
echo MONGO_URI=mongodb://localhost:27017/soa_system
echo.
echo # JWT - CLAVE UNIFICADA PARA AMBOS BACKENDS
echo JWT_SECRET=%JWT_SECRET%
echo JWT_EXPIRES_IN=24h
echo.
echo # Base URL para Swagger
echo BASE_URL=http://localhost:3001
) > backend1\.env

echo 📝 Creando backend2/.env...
(
echo MYSQL_HOST=localhost
echo MYSQL_USER=root
echo MYSQL_PASSWORD=
echo MYSQL_DB=soa_products
echo MYSQL_PORT=3306
echo.
echo # JWT - MISMA CLAVE QUE BACKEND 1 ^(CRÍTICO^)
echo JWT_SECRET=%JWT_SECRET%
echo.
echo # Flask
echo FLASK_ENV=development
echo FLASK_DEBUG=True
echo.
echo # CORS
echo CLIENT_ORIGIN=http://localhost:5173
echo FRONTEND_URL=http://localhost:5173
) > backend2\.env

echo.
echo ✅ Archivos .env creados exitosamente
echo.
echo 📋 Verificando contenido de los archivos:
echo.
echo === BACKEND1/.ENV ===
type backend1\.env
echo.
echo === BACKEND2/.ENV ===
type backend2\.env
echo.
echo 🔄 Próximos pasos:
echo 1. Detén los servidores actuales ^(Ctrl+C^)
echo 2. Terminal 1: cd backend1 ^&^& npm start
echo 3. Terminal 2: cd backend2 ^&^& python app.py
echo.
pause
