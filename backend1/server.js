import express from "express"
import cors from "cors"
import dotenv from "dotenv"
import helmet from "helmet"
import morgan from "morgan"
import rateLimit from "express-rate-limit"
import os from "os"

import { connectDB } from "./config/database.js"
import swaggerSetup from "./config/swagger.js"

import authRoutes from "./routes/auth.js"
import userRoutes from "./routes/users.js"
import salesRoutes from "./routes/sales.js"

dotenv.config()
const app = express()
const PORT = process.env.PORT || 3001

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
      "http://localhost:5000",
      "http://127.0.0.1:5173",
      "http://192.168.2.213:5173",
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

app.use((err, _req, res, _next) => {
  console.error(err.stack)
  res.status(500).json({ success: false, message: "Error interno", error: err.message })
})
app.use("*", (_req, res) => res.status(404).json({ success: false, message: "Ruta no encontrada" }))

// --- Inicialización de DB y servidor ---
const startServer = async () => {
  try {
    // Esperar conexión a DB y datos iniciales
    await connectDB()

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
