import mongoose from "mongoose"
import bcrypt from "bcrypt"
import { User, Role, Sale } from "./models/index.js"
import dotenv from "dotenv"

dotenv.config()

const initDatabase = async () => {
  try {
    console.log("🔗 Conectando a MongoDB...")
    await mongoose.connect(process.env.MONGODB_URI)
    console.log("✅ Conectado a MongoDB")

    // Limpiar colecciones existentes (opcional)
    console.log("🧹 Limpiando datos existentes...")
    await Sale.deleteMany({})
    console.log("✅ Ventas eliminadas")

    // Crear roles si no existen
    const roles = [
      { name: "Administrador", permissions: ["all"] },
      { name: "Vendedor", permissions: ["read_own_sales", "create_sales"] },
      { name: "Consultor", permissions: ["read_all_sales", "read_reports"] },
    ]

    console.log("📋 Creando roles...")
    for (const roleData of roles) {
      const existingRole = await Role.findOne({ name: roleData.name })
      if (!existingRole) {
        await Role.create(roleData)
        console.log(`✅ Rol creado: ${roleData.name}`)
      } else {
        console.log(`ℹ️  Rol ya existe: ${roleData.name}`)
      }
    }

    // Obtener los roles creados
    const adminRole = await Role.findOne({ name: "Administrador" })
    const vendedorRole = await Role.findOne({ name: "Vendedor" })
    const consultorRole = await Role.findOne({ name: "Consultor" })

    // Crear usuarios si no existen
    const users = [
      {
        name: "Admin User",
        email: "admin@test.com",
        password: await bcrypt.hash("password123", 12),
        role: adminRole._id,
      },
      {
        name: "Vendedor 1",
        email: "vendedor1@test.com",
        password: await bcrypt.hash("password123", 12),
        role: vendedorRole._id,
      },
      {
        name: "Vendedor 2",
        email: "vendedor2@test.com",
        password: await bcrypt.hash("password123", 12),
        role: vendedorRole._id,
      },
      {
        name: "Consultor User",
        email: "consultor@test.com",
        password: await bcrypt.hash("password123", 12),
        role: consultorRole._id,
      },
    ]

    console.log("👥 Creando usuarios...")
    const createdUsers = []
    for (const userData of users) {
      const existingUser = await User.findOne({ email: userData.email })
      if (!existingUser) {
        const user = await User.create(userData)
        createdUsers.push(user)
        console.log(`✅ Usuario creado: ${userData.email}`)
      } else {
        createdUsers.push(existingUser)
        console.log(`ℹ️  Usuario ya existe: ${userData.email}`)
      }
    }

    // Crear ventas de prueba
    console.log("🛒 Creando ventas de prueba...")
    
    const salesData = [
      {
        user_id: createdUsers[1]._id, // Vendedor 1
        products: [
          {
            productId: 1,
            name: "Laptop HP",
            quantity: 1,
            price: 15000,
            purchase_price: 12000,
            profit: 3000
          },
          {
            productId: 2,
            name: "Mouse Logitech",
            quantity: 2,
            price: 500,
            purchase_price: 300,
            profit: 400
          }
        ],
        total: 16000,
        total_profit: 3400,
        status: "completed",
        notes: "Venta a cliente corporativo",
      },
      {
        user_id: createdUsers[2]._id, // Vendedor 2
        products: [
          {
            productId: 3,
            name: "Teclado Mecánico",
            quantity: 1,
            price: 2500,
            purchase_price: 1800,
            profit: 700
          }
        ],
        total: 2500,
        total_profit: 700,
        status: "completed",
        notes: "Venta directa",
      },
      {
        user_id: createdUsers[1]._id, // Vendedor 1
        products: [
          {
            productId: 4,
            name: "Monitor Samsung 24''",
            quantity: 1,
            price: 8000,
            purchase_price: 6000,
            profit: 2000
          },
          {
            productId: 5,
            name: "Cable HDMI",
            quantity: 1,
            price: 200,
            purchase_price: 100,
            profit: 100
          }
        ],
        total: 8200,
        total_profit: 2100,
        status: "completed",
        notes: "Venta con descuento aplicado",
      },
      {
        user_id: createdUsers[2]._id, // Vendedor 2
        products: [
          {
            productId: 6,
            name: "Impresora Canon",
            quantity: 1,
            price: 5500,
            purchase_price: 4000,
            profit: 1500
          }
        ],
        total: 5500,
        total_profit: 1500,
        status: "pending",
        notes: "Pendiente de entrega",
      }
    ]

    for (const saleData of salesData) {
      const sale = await Sale.create(saleData)
      console.log(`✅ Venta creada: $${sale.total} por ${createdUsers.find(u => u._id.equals(sale.user_id)).name}`)
    }

    console.log("\n🎉 ¡Base de datos inicializada correctamente!")
    console.log("\n📊 Resumen:")
    console.log(`👥 Usuarios: ${createdUsers.length}`)
    console.log(`📋 Roles: ${roles.length}`)
    console.log(`🛒 Ventas: ${salesData.length}`)
    
    console.log("\n🔑 Credenciales de acceso:")
    console.log("Admin: admin@test.com / password123")
    console.log("Vendedor 1: vendedor1@test.com / password123")
    console.log("Vendedor 2: vendedor2@test.com / password123")
    console.log("Consultor: consultor@test.com / password123")

  } catch (error) {
    console.error("❌ Error al inicializar la base de datos:", error)
    process.exit(1)
  } finally {
    await mongoose.disconnect()
    console.log("🔌 Desconectado de MongoDB")
    process.exit(0)
  }
}

initDatabase()