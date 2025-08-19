// dbInit.js
import mongoose from "mongoose";
import dotenv from "dotenv";
import Role from "./models/Role.js";
import User from "./models/User.js";
import Sale from "./models/Sale.js";

dotenv.config();

const connectDB = async () => {
  try {
    // Conectar a MongoDB Atlas usando la cadena de conexión
    await mongoose.connect(process.env.MONGO_URI);
    console.log(`✅ Conectado a MongoDB Atlas: ${mongoose.connection.host}`);

    // 1️⃣ Inicializar roles por defecto
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
        description: "Rol con todos los permisos",
      },
      {
        name: "Vendedor",
        permissions: { manageSales: true },
        description: "Rol para vendedores",
      },
      {
        name: "Consultor",
        permissions: { viewReports: true },
        description: "Rol para consultores",
      },
      {
        name: "Almacenista",
        permissions: { manageInventory: true },
        description: "Rol para almacén",
      },
    ];

    for (const role of defaultRoles) {
      const exists = await Role.findOne({ name: role.name });
      if (!exists) {
        await Role.create(role);
        console.log(`➕ Rol creado: ${role.name}`);
      }
    }

    // 2️⃣ Crear usuario administrador por defecto
    const adminRole = await Role.findOne({ name: "Administrador" });
    const adminExists = await User.findOne({ email: "admin@example.com" });
    if (!adminExists) {
      await User.create({
        name: "Admin",
        email: "admin@example.com",
        password: "admin123", // tu modelo debería hashear esto automáticamente
        role_id: adminRole._id,
      });
      console.log("➕ Usuario administrador creado: admin@example.com");
    }

    // 3️⃣ Crear algunos usuarios de ejemplo
    const vendedorRole = await Role.findOne({ name: "Vendedor" });
    const consultorRole = await Role.findOne({ name: "Consultor" });

    const sampleUsers = [
      { name: "Juan Perez", email: "juan@example.com", password: "123456", role_id: vendedorRole._id },
      { name: "Maria Lopez", email: "maria@example.com", password: "123456", role_id: consultorRole._id },
    ];

    for (const user of sampleUsers) {
      const exists = await User.findOne({ email: user.email });
      if (!exists) {
        await User.create(user);
        console.log(`➕ Usuario creado: ${user.email}`);
      }
    }

    // 4️⃣ Crear algunas ventas de prueba
    const adminUser = await User.findOne({ email: "admin@example.com" });
    const saleExists = await Sale.findOne();
    if (!saleExists) {
      const sampleSales = [
        { product: "Laptop", quantity: 2, price: 1500, user_id: adminUser._id },
        { product: "Mouse", quantity: 10, price: 20, user_id: adminUser._id },
      ];
      await Sale.insertMany(sampleSales);
      console.log("➕ Ventas de prueba creadas");
    }

    console.log("✅ Base de datos `soa_system` inicializada con roles, usuarios y ventas");
    process.exit(0);

  } catch (error) {
    console.error("❌ Error conectando o inicializando MongoDB Atlas:", error.message);
    process.exit(1);
  }
};

// Ejecutar la función
connectDB();
