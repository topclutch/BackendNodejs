import express from "express"
import { Sale } from "../models/index.js"
import { authenticateToken, requireRole } from "../middleware/auth.js"
import axios from "axios"

const router = express.Router()
const BACKEND2_URL = process.env.BACKEND2_URL || "http://localhost:5000"

/**
 * @swagger
 * components:
 *   schemas:
 *     SaleProduct:
 *       type: object
 *       properties:
 *         productId:
 *           type: integer
 *           description: ID del producto
 *         name:
 *           type: string
 *           description: Nombre del producto
 *         quantity:
 *           type: integer
 *           minimum: 1
 *           description: Cantidad vendida
 *         price:
 *           type: number
 *           format: float
 *           minimum: 0
 *           description: Precio de venta unitario
 *         purchase_price:
 *           type: number
 *           format: float
 *           description: Precio de compra unitario
 *         profit:
 *           type: number
 *           format: float
 *           description: Ganancia por producto
 *     Sale:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: ID único de la venta
 *         user_id:
 *           type: object
 *           properties:
 *             _id:
 *               type: string
 *             name:
 *               type: string
 *             email:
 *               type: string
 *         products:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/SaleProduct'
 *         total:
 *           type: number
 *           format: float
 *           description: Total de la venta
 *         total_profit:
 *           type: number
 *           format: float
 *           description: Ganancia total de la venta
 *         status:
 *           type: string
 *           enum: [pending, completed, failed]
 *           description: Estado de la venta
 *         notes:
 *           type: string
 *           description: Notas adicionales
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     CreateSaleRequest:
 *       type: object
 *       required:
 *         - products
 *       properties:
 *         products:
 *           type: array
 *           items:
 *             type: object
 *             required:
 *               - productId
 *               - name
 *               - quantity
 *               - price
 *             properties:
 *               productId:
 *                 type: integer
 *               name:
 *                 type: string
 *               quantity:
 *                 type: integer
 *                 minimum: 1
 *               price:
 *                 type: number
 *                 format: float
 *                 minimum: 0
 *         notes:
 *           type: string
 *           description: Notas adicionales
 */

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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Sale'
 *       401:
 *         description: Token inválido o expirado
 *       500:
 *         description: Error interno del servidor
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateSaleRequest'
 *     responses:
 *       201:
 *         description: Venta creada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Sale'
 *                 stockUpdates:
 *                   type: array
 *                   items:
 *                     type: object
 *       400:
 *         description: Datos inválidos o error en actualización de stock
 *       401:
 *         description: Token inválido o expirado
 *       500:
 *         description: Error interno del servidor
 */
router.post("/", authenticateToken, async (req, res) => {
  try {
    const { products, notes } = req.body

    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Debe incluir al menos un producto",
      })
    }

    // Validación de productos
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
        })
      }
    }

    // Obtener precios de compra desde backend2
    const productsWithCost = await Promise.all(
      products.map(async (p) => {
        try {
          const response = await axios.get(`${BACKEND2_URL}/api/products/${p.productId}`)
          return {
            ...p,
            purchase_price: response.data.data.purchase_price,
          }
        } catch (error) {
          console.error(`Error obteniendo producto ${p.productId}:`, error.message)
          return null
        }
      }),
    )

    // Verificar si algún producto no se pudo obtener
    if (productsWithCost.some((p) => p === null)) {
      return res.status(400).json({
        success: false,
        message: "Error obteniendo información de productos",
      })
    }

    // Calcular ganancias
    const productsWithProfit = productsWithCost.map((p) => ({
      ...p,
      profit: (p.price - p.purchase_price) * p.quantity,
    }))

    const totalProfit = productsWithProfit.reduce((sum, p) => sum + p.profit, 0)

    // Crear la venta
    const newSale = new Sale({
      user_id: req.user.userId,
      products: productsWithProfit,
      total: productsWithProfit.reduce((sum, p) => sum + p.quantity * p.price, 0),
      total_profit: totalProfit,
      notes,
      status: "pending",
    })

    const savedSale = await newSale.save()

    // Actualizar el stock de cada producto
    const stockUpdatePromises = products.map(async (product) => {
      try {
        const response = await axios.patch(
          `${BACKEND2_URL}/api/products/${product.productId}/decrease-stock`,
          { quantity: product.quantity },
          {
            headers: {
              Authorization: req.headers.authorization,
              "Content-Type": "application/json",
            },
            timeout: 10000,
          },
        )
        return { success: true, productId: product.productId, data: response.data }
      } catch (error) {
        console.error(`Error actualizando stock del producto ${product.productId}:`, error.message)
        return {
          success: false,
          productId: product.productId,
          error: error.response?.data?.message || error.message,
        }
      }
    })

    const stockResults = await Promise.all(stockUpdatePromises)
    const failedUpdates = stockResults.filter((result) => !result.success)

    if (failedUpdates.length > 0) {
      savedSale.status = "failed"
      savedSale.notes =
        (savedSale.notes || "") +
        ` | Errores de stock: ${failedUpdates.map((f) => `Producto ${f.productId}: ${f.error}`).join(", ")}`
      await savedSale.save()

      return res.status(400).json({
        success: false,
        message: "Error al actualizar el stock de algunos productos",
        data: savedSale,
        stockErrors: failedUpdates,
      })
    }

    // Si todo salió bien, marcar como completada
    savedSale.status = "completed"
    await savedSale.save()

    res.status(201).json({
      success: true,
      message: "Venta creada y stock actualizado exitosamente",
      data: savedSale,
      stockUpdates: stockResults,
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
 *     description: Permite filtrar ventas por fecha y usuario (solo para Administrador y Consultor)
 *     tags: [Ventas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de inicio (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de fin (YYYY-MM-DD)
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: ID del usuario vendedor
 *     responses:
 *       200:
 *         description: Ventas filtradas obtenidas exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Sale'
 *       401:
 *         description: Token inválido o expirado
 *       403:
 *         description: Permisos insuficientes (solo Administrador y Consultor)
 *       500:
 *         description: Error interno del servidor
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

export default router
