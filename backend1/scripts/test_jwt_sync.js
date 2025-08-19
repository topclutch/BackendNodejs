// Script para probar sincronización de JWT entre backends
import axios from "axios"
import jwt from "jsonwebtoken"

const BACKEND1_URL = "http://localhost:3001"
const BACKEND2_URL = "http://localhost:5000"

async function testJWTSync() {
  console.log("🔍 Probando sincronización de JWT entre backends...\n")

  try {
    // 1. Verificar que ambos backends estén funcionando
    console.log("1. Verificando salud de backends...")
    const health1 = await axios.get(`${BACKEND1_URL}/health`)
    const health2 = await axios.get(`${BACKEND2_URL}/health`)
    console.log("✅ Backend 1:", health1.data.message)
    console.log("✅ Backend 2:", health2.data.message)

    // 2. Verificar configuración JWT en Backend 2
    console.log("\n2. Verificando configuración JWT...")
    try {
      const jwtDebug = await axios.get(`${BACKEND2_URL}/debug/jwt`)
      console.log("🔑 JWT Debug Backend 2:", jwtDebug.data)
    } catch (error) {
      console.log("⚠️ No se pudo obtener debug JWT de Backend 2")
    }

    // 3. Hacer login en Backend 1
    console.log("\n3. Realizando login en Backend 1...")
    const loginResponse = await axios.post(`${BACKEND1_URL}/api/auth/login`, {
      email: "juan@ventas.com",
      password: "vendedor123",
    })

    const token = loginResponse.data.token
    console.log("✅ Login exitoso")
    console.log(`🎫 Token obtenido: ${token.substring(0, 50)}...`)

    // 4. Decodificar token para verificar contenido
    console.log("\n4. Decodificando token...")
    try {
      const decoded = jwt.decode(token)
      console.log("📋 Contenido del token:")
      console.log(`   Usuario ID: ${decoded.userId}`)
      console.log(`   Email: ${decoded.email}`)
      console.log(`   Rol: ${decoded.role}`)
      console.log(`   Nombre: ${decoded.name}`)
      console.log(`   Expira: ${new Date(decoded.exp * 1000).toLocaleString()}`)
    } catch (error) {
      console.log("❌ Error decodificando token:", error.message)
    }

    // 5. Probar token en Backend 2 - obtener productos primero
    console.log("\n5. Obteniendo productos (sin auth)...")
    const productsResponse = await axios.get(`${BACKEND2_URL}/api/products`)
    console.log(`✅ ${productsResponse.data.count} productos obtenidos`)

    if (productsResponse.data.data.length === 0) {
      console.log("❌ No hay productos para probar decrease-stock")
      return
    }

    const testProduct = productsResponse.data.data[0]
    console.log(`📦 Producto de prueba: ${testProduct.name} (ID: ${testProduct.id}, Stock: ${testProduct.stock})`)

    // 6. Probar decrease-stock con el token
    console.log("\n6. Probando decrease-stock con token...")

    if (testProduct.stock < 1) {
      console.log("❌ El producto no tiene stock suficiente para la prueba")
      return
    }

    const decreaseResponse = await axios.patch(
      `${BACKEND2_URL}/api/products/${testProduct.id}/decrease-stock`,
      { quantity: 1 },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        timeout: 10000,
      },
    )

    console.log("✅ Decrease-stock exitoso!")
    console.log(`📦 Stock anterior: ${testProduct.stock}`)
    console.log(`📦 Stock nuevo: ${decreaseResponse.data.data.stock}`)
    console.log(`💬 Mensaje: ${decreaseResponse.data.message}`)

    console.log("\n🎉 ¡Prueba de JWT exitosa! Los backends están sincronizados correctamente.")
  } catch (error) {
    console.error("\n❌ Error en la prueba:")

    if (error.response) {
      console.log(`   Status: ${error.response.status}`)
      console.log(`   Mensaje: ${error.response.data?.message || "Sin mensaje"}`)
      console.log(`   Código: ${error.response.data?.code || "Sin código"}`)

      if (error.response.status === 401) {
        console.log("\n🔧 Posibles soluciones:")
        console.log("   1. Verifica que JWT_SECRET sea EXACTAMENTE igual en ambos .env")
        console.log("   2. Reinicia ambos servidores después de cambiar .env")
        console.log("   3. Verifica que no haya espacios extra en JWT_SECRET")
        console.log("   4. Ejecuta: python backend2/debug_token.py")
      }
    } else if (error.code === "ECONNREFUSED") {
      console.log("   🔍 Problema de conexión - ¿Están ambos backends ejecutándose?")
    } else {
      console.log(`   Error: ${error.message}`)
    }
  }
}

// Ejecutar las pruebas
testJWTSync()
