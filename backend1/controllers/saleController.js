import Sale from "../models/Sale.js"
import axios from "axios"

const BACKEND2_URL = process.env.BACKEND2_URL || "http://localhost:5000"

export const getSales = async (req, res) => {
  try {
    let filter = {}

    if (req.user.role === "Vendedor") {
      filter = { user_id: req.user.userId }
    }

    console.log("=== DEBUG SALES ===")
    const sales = await Sale.find(filter).populate("user_id", "name email").sort({ createdAt: -1 })
    console.log(`Total sales encontradas: ${sales.length}`)

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
      error: process.env.NODE_ENV === "development" ? error.message : "Error interno",
    })
  }
}

export const createSale = async (req, res) => {
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

    // Crear la venta primero
    const newSale = new Sale({
      user_id: req.user.userId,
      products: products.map((p) => ({
        productId: p.productId,
        name: p.name,
        quantity: p.quantity,
        price: p.price,
      })),
      total: products.reduce((sum, p) => sum + p.quantity * p.price, 0),
      notes,
      status: "pending", // Inicialmente pendiente
    })

    const savedSale = await newSale.save()

    // Ahora actualizar el stock de cada producto
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
      // Si falló alguna actualización de stock, marcar la venta como fallida
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
}

export const getSalesWithFilters = async (req, res) => {
  try {
    if (req.user.role !== "Administrador") {
      return res.status(403).json({
        success: false,
        message: "Acceso no autorizado",
      })
    }

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
      error: process.env.NODE_ENV === "development" ? error.message : "Error interno",
    })
  }
}
