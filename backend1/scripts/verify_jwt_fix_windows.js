// Script para verificar JWT_SECRET en Windows
import fs from "fs"
import path from "path"

function extractJWTSecret(envPath) {
  try {
    if (!fs.existsSync(envPath)) {
      return { exists: false, secret: null, error: "Archivo no existe" }
    }

    const envContent = fs.readFileSync(envPath, "utf8")
    const lines = envContent.split(/\r?\n/)
    const jwtLine = lines.find((line) => line.trim().startsWith("JWT_SECRET="))

    if (!jwtLine) {
      return { exists: true, secret: null, error: "JWT_SECRET no encontrado en el archivo" }
    }

    const secret = jwtLine.split("=")[1]?.trim().replace(/"/g, "")
    return { exists: true, secret, error: null }
  } catch (error) {
    return { exists: false, secret: null, error: error.message }
  }
}

function verifyJWTSync() {
  console.log("🔍 Verificando sincronización de JWT_SECRET en Windows...\n")

  const backend1Path = path.resolve("backend1", ".env")
  const backend2Path = path.resolve("backend2", ".env")

  console.log(`📁 Verificando: ${backend1Path}`)
  console.log(`📁 Verificando: ${backend2Path}\n`)

  const backend1Result = extractJWTSecret(backend1Path)
  const backend2Result = extractJWTSecret(backend2Path)

  console.log("Backend 1 (.env):")
  console.log(`  📁 Existe: ${backend1Result.exists ? "✅ Sí" : "❌ No"}`)
  if (backend1Result.error) {
    console.log(`  ❌ Error: ${backend1Result.error}`)
  } else {
    console.log(`  🔑 JWT_SECRET: ${backend1Result.secret || "❌ NO ENCONTRADO"}`)
    console.log(`  📏 Longitud: ${backend1Result.secret ? backend1Result.secret.length : 0}`)
  }

  console.log("\nBackend 2 (.env):")
  console.log(`  📁 Existe: ${backend2Result.exists ? "✅ Sí" : "❌ No"}`)
  if (backend2Result.error) {
    console.log(`  ❌ Error: ${backend2Result.error}`)
  } else {
    console.log(`  🔑 JWT_SECRET: ${backend2Result.secret || "❌ NO ENCONTRADO"}`)
    console.log(`  📏 Longitud: ${backend2Result.secret ? backend2Result.secret.length : 0}`)
  }

  console.log("\n" + "=".repeat(60))

  if (!backend1Result.exists || !backend2Result.exists) {
    console.log("❌ ERROR: Uno o ambos archivos .env no existen")
    console.log("🔧 Solución: Ejecuta 'scripts\\fix_jwt_secrets.bat'")
    return false
  }

  if (backend1Result.error || backend2Result.error) {
    console.log("❌ ERROR: No se pudo leer uno o ambos archivos")
    console.log("🔧 Solución: Verifica los permisos de archivos")
    return false
  }

  if (!backend1Result.secret || !backend2Result.secret) {
    console.log("❌ ERROR: JWT_SECRET no encontrado en uno o ambos archivos")
    console.log("🔧 Solución: Ejecuta 'scripts\\fix_jwt_secrets.bat'")
    return false
  }

  if (backend1Result.secret === backend2Result.secret) {
    console.log("✅ ¡PERFECTO! Los JWT_SECRET coinciden exactamente")
    console.log("🔄 Ahora reinicia ambos servidores:")
    console.log("   1. Ejecuta: scripts\\kill_servers.bat")
    console.log("   2. Terminal 1: scripts\\start_backend1.bat")
    console.log("   3. Terminal 2: scripts\\start_backend2.bat")
    return true
  } else {
    console.log("❌ ERROR: Los JWT_SECRET NO coinciden")
    console.log("\nDiferencias:")
    console.log(`  Backend 1: "${backend1Result.secret}"`)
    console.log(`  Backend 2: "${backend2Result.secret}"`)
    console.log("\n🔧 Solución: Ejecuta 'scripts\\fix_jwt_secrets.bat'")
    return false
  }
}

// Ejecutar verificación
const isFixed = verifyJWTSync()

if (isFixed) {
  console.log("\n🚀 Todo listo para reiniciar los servidores!")
}
