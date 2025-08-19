import express from "express"
import cors from "cors"
import dotenv from "dotenv"
import helmet from "helmet"
import morgan from "morgan"
import rateLimit from "express-rate-limit"
import os from "os"

import { connectDB } from "./config/database.js"
import swaggerSetup from "./config/swagger.js"

// Importar modelos para inicialización
import Role from "./models/Role.js"
import User from "./models/User.js"
import Sale from "./models/Sale.js"

import authRoutes from "./routes/auth.js"
import userRoutes from "./routes/users.js"
import salesRoutes from "./routes/sales.js"

dotenv.config()
const app = express()
const PORT = process.env.PORT || 3001

// Función para inicializar datos
const initializeData = async () => {
  try {
    console.log("🔍 Verificando datos iniciales...")
    
    // Verificar si ya existen datos
    const roleCount = await Role.countDocuments()
    const userCount = await User.countDocuments()
    
    if (roleCount > 0 && userCount > 0) {
      console.log(`✅ Datos ya existentes: ${roleCount} roles, ${userCount} usuarios`)
      return
    }
    
    console.log("📝 Inicializando datos por primera vez...")
    
    // Limpiar datos existentes
    await Promise.all([
      Role.deleteMany({}),
      User.deleteMany({}),
      Sale.deleteMany({})
    ])
    
    // Crear roles
    const defaultRoles = [
      {
        name: "Administrador",
        permissions: {
          manageUsers: true,
          manageProducts: true,
          viewReports: true,
          manageSales: true,
          manageInventory: true,
        },
        description: "Acceso total al sistema",
      },
      {
        name: "Vendedor",
        permissions: {
          manageUsers: false,
          manageProducts: false,
          viewReports: false,
          manageSales: true,
          manageInventory: false,
        },
        description: "Puede gestionar ventas",
      },
      {
        name: "Consultor",
        permissions: {
          manageUsers: false,
          manageProducts: false,
          viewReports: true,
          manageSales: false,
          manageInventory: false,
        },
        description: "Puede ver reportes",
      },
      {
        name: "Almacenista",
        permissions: {
          manageUsers: false,
          manageProducts: true,
          viewReports: false,
          manageSales: false,
          manageInventory: true,
        },
        description: "Gestiona inventario y productos",
      },
    ]
    
    const createdRoles = await Role.insertMany(defaultRoles)
    console.log(`✅ ${createdRoles.length} roles creados`)
    
    // Función helper para obtener roles
    const getRoleId = (name) => {
      const role = createdRoles.find(role => role.name === name)
      if (!role) {
        throw new Error(`❌ Rol '${name}' no encontrado`)
      }
      return role._id
    }
    
    // Crear usuarios
    const usersData = [
      {
        name: "Administrador",
        email: "admin@example.com",
        password: "admin123",
        role_id: getRoleId("Administrador"),
        active: true,
      },
      {
        name: "Vendedor Juan",
        email: "juan@ventas.com",
        password: "vendedor123",
        role_id: getRoleId("Vendedor"),
        active: true,
      },
      {
        name: "Consultora Ana",
        email: "ana@consultoria.com",
        password: "consultor123",
        role_id: getRoleId("Consultor"),
        active: true,
      },
      {
        name: "Almacenista Pedro",
        email: "pedro@almacen.com",
        password: "almacen123",
        role_id: getRoleId("Almacenista"),
        active: true,
      },
    ]
    
    // Crear usuarios uno por uno para activar middleware pre-save
    const createdUsers = []
    for (const userData of usersData) {
      try {
        const user = new User(userData)
        await user.save()
        createdUsers.push(user)
        console.log(`  ✅ Usuario creado: ${userData.name} (${userData.email})`)
      } catch (userError) {
        console.error(`  ❌ Error creando ${userData.name}:`, userError.message)
      }
    }
    
    // Crear ventas de ejemplo si hay usuarios
    if (createdUsers.length > 0) {
      const adminUser = createdUsers.find(user => user.email === "admin@example.com")
      const vendedorUser = createdUsers.find(user => user.email === "juan@ventas.com")
      
      if (adminUser && vendedorUser) {
        const sales = [
          { 
            product: "iPhone 14 Pro", 
            quantity: 2, 
            price: 1299.99, 
            createdBy: vendedorUser._id,
            notes: "Venta realizada por Juan"
          },
          { 
            product: "MacBook Air", 
            quantity: 1, 
            price: 1199.99, 
            createdBy: vendedorUser._id,
            notes: "Cliente frecuente"
          },
          { 
            product: "iPad Pro", 
            quantity: 1, 
            price: 1099.99, 
            createdBy: adminUser._id,
            notes: "Venta administrativa"
          }
        ]
        
        const createdSales = await Sale.insertMany(sales)
        console.log(`✅ ${createdSales.length} ventas de ejemplo creadas`)
      }
    }
    
    console.log("🎉 Datos iniciales creados exitosamente")
    console.log("🔐 CREDENCIALES DE PRUEBA:")
    console.log("📧 Administrador: admin@example.com | 🔑 admin123")
    console.log("📧 Vendedor: juan@ventas.com | 🔑 vendedor123")
    console.log("📧 Consultora: ana@consultoria.com | 🔑 consultor123")
    console.log("📧 Almacenista: pedro@almacen.com | 🔑 almacen123")
    
  } catch (error) {
    console.error("❌ Error inicializando datos:", error.message)
    // No detener el servidor si falla la inicialización
  }
}

process.on("SIGTERM", () => {
  console.log("🔄 Cerrando servidor gracefully...")
  process.exit(0)
})

process.on("SIGINT", () => {
  console.log("🔄 Cerrando servidor gracefully...")
  process.exit(0)
})

app.use(helmet())
app.use(morgan("combined"))

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: "Demasiadas solicitudes desde esta IP, intenta más tarde.",
  }),
)

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://backendflask-r0xg.onrender.com",
      "http://127.0.0.1:5173",
      "http://192.168.2.213:5173",
      "https://frontendreactvite.onrender.com",
      "http://127.0.0.1:5000",
      /^http:\/\/192\.168\.\d{1,3}\.\d{1,3}:5173$/,
      /^http:\/\/192\.168\.\d{1,3}\.\d{1,3}:5000$/,
      /^http:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}:5173$/,
      /^http:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}:5000$/,
      /^http:\/\/172\.(1[6-9]|2[0-9]|3[0-1])\.\d{1,3}\.\d{1,3}:5173$/,
      /^http:\/\/172\.(1[6-9]|2[0-9]|3[0-1])\.\d{1,3}\.\d{1,3}:5000$/,
      /^https:\/\/192\.168\.\d{1,3}\.\d{1,3}:5173$/,
      /^https:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}:5173$/,
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  }),
)

app.use(express.json({ limit: "10mb" }))
app.use(express.urlencoded({ extended: true }))

// --- Rutas ---
app.use("/api/auth", authRoutes)
app.use("/api/users", userRoutes)
app.use("/api/sales", salesRoutes)

app.get("/health", (_req, res) =>
  res.json({
    status: "OK",
    message: "Backend 1 funcionando",
    timestamp: new Date().toISOString(),
  }),
)

// Nueva ruta para reinicializar datos manualmente
app.post("/api/admin/reinitialize", async (req, res) => {
  try {
    await initializeData()
    res.json({ success: true, message: "Datos reinicializados correctamente" })
  } catch (error) {
    res.status(500).json({ success: false, message: "Error reinicializando datos", error: error.message })
  }
})

app.use((err, _req, res, _next) => {
  console.error(err.stack)
  res.status(500).json({ success: false, message: "Error interno", error: err.message })
})

app.use("*", (_req, res) => res.status(404).json({ success: false, message: "Ruta no encontrada" }))

// --- Inicialización de DB y servidor ---
const startServer = async () => {
  try {
    // Esperar conexión a DB
    await connectDB()
    
    // Inicializar datos si es necesario
    await initializeData()

    // Configurar Swagger
    swaggerSetup(app)

    const server = app.listen(PORT, "0.0.0.0", () => {
      console.log(`📚 Swagger disponible en http://localhost:${PORT}/api-docs`)
      console.log(`🚀 Backend 1 corriendo en:`)
      console.log(`   - http://localhost:${PORT}`)
      console.log(`   - http://127.0.0.1:${PORT}`)
      console.log(`   - http://0.0.0.0:${PORT}`)

      const networkInterfaces = os.networkInterfaces()
      Object.keys(networkInterfaces).forEach((interfaceName) => {
        networkInterfaces[interfaceName].forEach((iface) => {
          if (iface.family === "IPv4" && !iface.internal) {
            console.log(`   - http://${iface.address}:${PORT} (Network - PWA Ready)`)
          }
        })
      })
    })

    server.on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        console.error(`❌ Puerto ${PORT} ya está en uso.`)
        console.log(`💡 Ejecuta: npx kill-port ${PORT}`)
        console.log(`💡 O usa: netstat -ano | findstr :${PORT}`)
        process.exit(1)
      } else {
        console.error("❌ Error del servidor:", err)
        process.exit(1)
      }
    })
  } catch (error) {
    console.error("❌ Error iniciando servidor:", error)
    process.exit(1)
  }
}

startServer()