// Script para verificar que el JWT_SECRET esté sincronizado
import fs from "fs"

function extractJWTSecret(envPath) {
  try {
    const envContent = fs.readFileSync(envPath, "utf8")
    const jwtLine = envContent.split("\n").find((line) => line.startsWith("JWT_SECRET="))
    return jwtLine ? jwtLine.split("=")[1].trim() : null
  } catch (error) {
    return null
  }
}

function verifyJWTSync() {
  console.log("🔍 Verificando sincronización de JWT_SECRET...\n")

  const backend1Secret = extractJWTSecret("backend1/.env")
  const backend2Secret = extractJWTSecret("backend2/.env")

  console.log("Backend 1 JWT_SECRET:")
  console.log(`  Archivo: backend1/.env`)
  console.log(`  Valor: ${backend1Secret || "❌ NO ENCONTRADO"}`)
  console.log(`  Longitud: ${backend1Secret ? backend1Secret.length : 0}`)

  console.log("\nBackend 2 JWT_SECRET:")
  console.log(`  Archivo: backend2/.env`)
  console.log(`  Valor: ${backend2Secret || "❌ NO ENCONTRADO"}`)
  console.log(`  Longitud: ${backend2Secret ? backend2Secret.length : 0}`)

  console.log("\n" + "=".repeat(60))

  if (!backend1Secret || !backend2Secret) {
    console.log("❌ ERROR: No se pudo leer JWT_SECRET de uno o ambos archivos")
    console.log("🔧 Solución: Ejecuta 'bash scripts/fix_jwt_secrets.sh'")
    return false
  }

  if (backend1Secret === backend2Secret) {
    console.log("✅ ¡PERFECTO! Los JWT_SECRET coinciden exactamente")
    console.log("🔄 Ahora reinicia ambos servidores para aplicar los cambios")
    return true
  } else {
    console.log("❌ ERROR: Los JWT_SECRET NO coinciden")
    console.log("\nDiferencias:")
    console.log(`  Backend 1: ${backend1Secret}`)
    console.log(`  Backend 2: ${backend2Secret}`)
    console.log("\n🔧 Solución: Ejecuta 'bash scripts/fix_jwt_secrets.sh'")
    return false
  }
}

// Ejecutar verificación
const isFixed = verifyJWTSync()

if (isFixed) {
  console.log("\n🚀 Próximos pasos:")
  console.log("1. Reinicia Backend 1: cd backend1 && npm start")
  console.log("2. Reinicia Backend 2: cd backend2 && python app.py")
  console.log("3. Prueba la integración: node scripts/test_jwt_sync.js")
}
