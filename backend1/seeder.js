import mongoose from "mongoose"
import dotenv from "dotenv"
import User from "../backend1/models/User.js"
import Sale from "../backend1/models/Sale.js"
import Role from "../backend1/models/Role.js"

dotenv.config()

const seedMongo = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI)
    console.log("✅ Conectado a MongoDB")

    // Limpiar datos previos
    await Promise.all([User.deleteMany(), Sale.deleteMany(), Role.deleteMany()])

    const rolesData = [
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
    const roles = await Role.insertMany(rolesData)
    console.log(
      "✅ Roles creados:",
      roles.map((r) => r.name),
    )

    const getRoleId = (name) => roles.find((r) => r.name === name)._id

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

    const users = []
    for (const userData of usersData) {
      const user = new User(userData)
      await user.save() // This triggers the pre-save middleware
      users.push(user)
      console.log(`✅ Usuario creado: ${user.name} (${user.email})`)
    }

    const vendedorUser = users.find((u) => u.email === "juan@ventas.com")
    await Sale.insertMany([
      {
        user_id: vendedorUser._id,
        products: [
          { productId: 1, name: "iPhone 14 Pro", quantity: 2, price: 1299.99 },
          { productId: 2, name: "MacBook Air", quantity: 1, price: 1199.99 },
        ],
        total: 3799.97,
        status: "completed",
        notes: "Cliente frecuente - descuento aplicado",
      },
      {
        user_id: vendedorUser._id,
        products: [{ productId: 3, name: "iPad Pro", quantity: 1, price: 1099.99 }],
        total: 1099.99,
        status: "pending",
        notes: "Pago pendiente - contactar cliente",
      },
    ])

    console.log("🎉 MongoDB seeding completado.")
    console.log("📋 Credenciales de prueba:")
    console.log("   Email: admin@example.com")
    console.log("   Password: admin123")
    process.exit(0)
  } catch (err) {
    console.error("❌ Error en seeding MongoDB:", err.message)
    process.exit(1)
  }
}

seedMongo()
