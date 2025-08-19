// Script para probar la integración entre backends
import axios from "axios"

const BACKEND1_URL = "http://localhost:3001"
const BACKEND2_URL = "http://localhost:5000"

async function testIntegration() {
  console.log("🧪 Iniciando pruebas de integración...\n")

  try {
    // 1. Probar salud de ambos backends
    console.log("1. Probando salud de backends...")
    const health1 = await axios.get(`${BACKEND1_URL}/health`)
    const health2 = await axios.get(`${BACKEND2_URL}/health`)
    console.log("✅ Backend 1:", health1.data.message)
    console.log("✅ Backend 2:", health2.data.message)

    // 2. Login para obtener token
    console.log("\n2. Realizando login...")
    const loginResponse = await axios.post(`${BACKEND1_URL}/api/auth/login`, {
      email: "juan@ventas.com",
      password: "vendedor123",
    })

    const token = loginResponse.data.token
    console.log("✅ Login exitoso, token obtenido")

    // 3. Obtener productos
    console.log("\n3. Obteniendo productos...")
    const productsResponse = await axios.get(`${BACKEND2_URL}/api/products`)
    console.log(`✅ ${productsResponse.data.count} productos obtenidos`)

    if (productsResponse.data.data.length === 0) {
      console.log("❌ No hay productos para probar")
      return
    }

    const testProduct = productsResponse.data.data[0]
    console.log(`📦 Producto de prueba: ${testProduct.name} (Stock: ${testProduct.stock})`)

    // 4. Probar disminución de stock
    console.log("\n4. Probando disminución de stock...")
    const decreaseResponse = await axios.patch(
      `${BACKEND2_URL}/api/products/${testProduct.id}/decrease-stock`,
      { quantity: 1 },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      },
    )

    console.log("✅ Stock disminuido exitosamente")
    console.log(`📦 Nuevo stock: ${decreaseResponse.data.data.stock}`)

    // 5. Crear una venta completa
    console.log("\n5. Creando venta completa...")
    const saleData = {
      products: [
        {
          productId: testProduct.id,
          name: testProduct.name,
          quantity: 2,
          price: testProduct.price,
        },
      ],
      notes: "Venta de prueba de integración",
    }

    const saleResponse = await axios.post(`${BACKEND1_URL}/api/sales`, saleData, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })

    console.log("✅ Venta creada exitosamente")
    console.log(`💰 Total: $${saleResponse.data.data.total}`)
    console.log(`📋 Estado: ${saleResponse.data.data.status}`)

    console.log("\n🎉 ¡Todas las pruebas pasaron exitosamente!")
    console.log("✅ La integración entre backends está funcionando correctamente")
  } catch (error) {
    console.error("\n❌ Error en las pruebas:", error.response?.data || error.message)

    if (error.response?.status === 401) {
      console.log("🔍 Problema de autenticación detectado")
    } else if (error.response?.status === 400) {
      console.log("🔍 Problema de validación de datos detectado")
    } else if (error.code === "ECONNREFUSED") {
      console.log("🔍 Problema de conexión - ¿Están ambos backends ejecutándose?")
    }
  }
}

// Ejecutar las pruebas
testIntegration()
