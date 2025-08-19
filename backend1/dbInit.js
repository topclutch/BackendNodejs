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
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`✅ Conectado a MongoDB Atlas: ${mongoose.connection.host}`);

    // Inicializar roles por defecto
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

    console.log("✅ Roles inicializados correctamente");

    // Crear usuario administrador por defecto si no existe
    const adminRole = await Role.findOne({ name: "Administrador" });
    const adminExists = await User.findOne({ email: "admin@example.com" });

    if (!adminExists) {
      await User.create({
        name: "Admin",
        email: "admin@example.com",
        password: "admin123",
        role_id: adminRole._id,
      });
      console.log("➕ Usuario administrador creado: admin@example.com");
    }

    // Inicializar colección de ventas si no existe
    const saleExists = await Sale.findOne();
    if (!saleExists) {
      console.log("ℹ️ Colección Sale lista para insertar datos");
    }

    console.log("✅ Base de datos inicializada correctamente");
    process.exit(0);

  } catch (error) {
    console.error("❌ Error conectando o inicializando MongoDB Atlas:", error.message);
    process.exit(1);
  }
};

// Ejecutar la función
connectDB();
