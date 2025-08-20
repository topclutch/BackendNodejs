import express from "express"
import { Sale } from "../models/index.js"
import { authenticateToken, requireRole } from "../middleware/auth.js"
import axios from "axios"

const router = express.Router()
const BACKEND2_URL = process.env.BACKEND2_URL || "http://localhost:5000"

// Función auxiliar para obtener información del producto con fallback
async function getProductInfo(productId, productData) {
  try {
    const response = await axios.get(`${BACKEND2_URL}/api/products/${productId}`, {
      timeout: 5000 // 5 segundos timeout
    })
    return {
      ...productData,
      purchase_price: response.data.data.purchase_price || 0,
    }
  } catch (error) {
    console.warn(`No se pudo obtener info del producto ${productId} desde backend2:`, error.message)
    // Fallback: usar precio de compra por defecto (70% del precio de venta)
    return {
      ...productData,
      purchase_price: productData.price * 0.7, // Asumimos 30% de margen
    }
  }
}

// Función auxiliar para actualizar stock con fallback
async function updateProductStock(productId, quantity, authHeader) {
  try {
    const response = await axios.patch(
      `${BACKEND2_URL}/api/products/${productId}/decrease-stock`,
      { quantity },
      {
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
        timeout: 10000,
      }
    )
    return { success: true, productId, data: response.data }
  } catch (error) {
    console.warn(`No se pudo actualizar stock del producto ${productId}:`, error.message)
    // En lugar de fallar, solo loggeamos el warning
    return {
      success: true, // Cambiamos a true para no bloquear la venta
      productId,
      warning: `Stock no actualizado: ${error.response?.data?.message || error.message}`,
    }
  }
}

/**
 * @swagger
 * /api/sales:
 *   get:
 *     summary: Obtener ventas
 *     description: Los vendedores solo ven sus propias ventas, otros roles ven todas
 *     tags: [Ventas]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de ventas obtenida exitosamente
 */
router.get("/", authenticateToken, async (req, res) => {
  try {
    let filter = {}

    // Vendedores solo ven sus ventas
    if (req.user.role === "Vendedor") {
      filter = { user_id: req.user.userId }
    }

    console.log("=== DEBUG SALES ===")
    const sales = await Sale.find(filter).populate("user_id", "name email").sort({ createdAt: -1 })

    console.log("Total sales encontradas:", sales.length)
    if (sales.length > 0) {
      console.log("Primera venta completa:", JSON.stringify(sales[0], null, 2))
      console.log("user_id de la primera venta:", sales[0].user_id)
      console.log("Tipo de user_id:", typeof sales[0].user_id)
    }
    console.log("==================")

    res.json({ success: true, data: sales })
  } catch (error) {
    console.error("Error al obtener ventas:", error)
    res.status(500).json({
      success: false,
      message: "Error al obtener ventas",
      error: error.message,
    })
  }
})

/**
 * @swagger
 * /api/sales:
 *   post:
 *     summary: Crear nueva venta
 *     description: Crea una venta y actualiza automáticamente el stock de productos
 *     tags: [Ventas]
 *     security:
 *       - bearerAuth: []
 */
router.post("/", authenticateToken, async (req, res) => {
  try {
    const { products, notes } = req.body

    console.log("=== CREANDO VENTA ===")
    console.log("Usuario:", req.user.userId)
    console.log("Productos recibidos:", JSON.stringify(products, null, 2))

    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Debe incluir al menos un producto",
      })
    }

    // Validación básica de productos
    for (const product of products) {
      if (
        !product.productId ||
        !product.quantity ||
        product.quantity <= 0 ||
        !product.price ||
        product.price <= 0 ||
        !product.name
      ) {
        return res.status(400).json({
          success: false,
          message: "Datos de producto inválidos",
          invalidProduct: product
        })
      }
    }

    console.log("Validación básica pasada, obteniendo precios de compra...")

    // Obtener precios de compra con fallback
    const productsWithCost = await Promise.all(
      products.map(async (p) => {
        console.log(`Obteniendo info para producto ${p.productId}...`)
        return await getProductInfo(p.productId, p)
      })
    )

    console.log("Productos con costos:", JSON.stringify(productsWithCost, null, 2))

    // Calcular ganancias
    const productsWithProfit = productsWithCost.map((p) => ({
      ...p,
      profit: (p.price - p.purchase_price) * p.quantity,
    }))

    const totalProfit = productsWithProfit.reduce((sum, p) => sum + p.profit, 0)
    const total = productsWithProfit.reduce((sum, p) => sum + p.quantity * p.price, 0)

    console.log("Total de la venta:", total)
    console.log("Ganancia total:", totalProfit)

    // Crear la venta
    const newSale = new Sale({
      user_id: req.user.userId,
      products: productsWithProfit,
      total,
      total_profit: totalProfit,
      notes,
      status: "pending",
    })

    console.log("Guardando venta...")
    const savedSale = await newSale.save()
    console.log("Venta guardada con ID:", savedSale._id)

    // Actualizar el stock de cada producto (con fallback)
    console.log("Actualizando stocks...")
    const stockUpdatePromises = products.map(async (product) => {
      return await updateProductStock(product.productId, product.quantity, req.headers.authorization)
    })

    const stockResults = await Promise.all(stockUpdatePromises)
    const warnings = stockResults.filter(result => result.warning)

    console.log("Resultados de actualización de stock:", stockResults)

    // Marcar como completada (incluso si hubo warnings de stock)
    savedSale.status = "completed"
    if (warnings.length > 0) {
      savedSale.notes = (savedSale.notes || "") + ` | Advertencias: ${warnings.map(w => w.warning).join(", ")}`
    }
    await savedSale.save()

    console.log("Venta completada exitosamente")
    console.log("=====================")

    res.status(201).json({
      success: true,
      message: "Venta creada exitosamente",
      data: savedSale,
      stockUpdates: stockResults,
      warnings: warnings.length > 0 ? warnings : undefined
    })
  } catch (error) {
    console.error("Error al crear venta:", error)

    let errorMessage = "Error al crear venta"
    if (error.name === "ValidationError") {
      errorMessage =
        "Error de validación: " +
        Object.values(error.errors)
          .map((e) => e.message)
          .join(", ")
    }

    res.status(500).json({
      success: false,
      message: errorMessage,
      error: error.message,
    })
  }
})

/**
 * @swagger
 * /api/sales/filters:
 *   get:
 *     summary: Obtener ventas con filtros
 */
router.get("/filters", authenticateToken, requireRole(["Administrador", "Consultor"]), async (req, res) => {
  try {
    const { startDate, endDate, userId } = req.query
    const filter = {}

    if (startDate && endDate) {
      filter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      }
    }

    if (userId) {
      filter.user_id = userId
    }

    const sales = await Sale.find(filter).populate("user_id", "name email").sort({ createdAt: -1 })

    res.json({ success: true, data: sales })
  } catch (error) {
    console.error("Error al obtener ventas con filtros:", error)
    res.status(500).json({
      success: false,
      message: "Error al obtener ventas",
      error: error.message,
    })
  }
})

// Endpoint adicional para crear venta de prueba
router.post("/test", authenticateToken, async (req, res) => {
  try {
    console.log("=== CREANDO VENTA DE PRUEBA ===")
    
    const testSale = new Sale({
      user_id: req.user.userId,
      products: [
        {
          productId: 1,
          name: "Producto de Prueba",
          quantity: 1,
          price: 100,
          purchase_price: 70,
          profit: 30
        }
      ],
      total: 100,
      total_profit: 30,
      notes: "Venta de prueba",
      status: "completed",
    })

    const savedSale = await testSale.save()
    console.log("Venta de prueba creada:", savedSale._id)

    res.status(201).json({
      success: true,
      message: "Venta de prueba creada exitosamente",
      data: savedSale
    })
  } catch (error) {
    console.error("Error al crear venta de prueba:", error)
    res.status(500).json({
      success: false,
      message: "Error al crear venta de prueba",
      error: error.message,
    })
  }
})

export default router