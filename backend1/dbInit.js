// dbInit.js
import mongoose from "mongoose";
import Role from "./models/Role.js";
import User from "./models/User.js";
import Sale from "./models/Sale.js";

// Conexión directa a MongoDB Atlas con base de datos soa_system
const MONGO_URI = "mongodb+srv://user:aUj0Z9UG83ElzX6c@cluster0.vkurtxa.mongodb.net/soa_system?retryWrites=true&w=majority&appName=Cluster0";

const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URI);

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

    // Crear usuario administrador si no existe
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

    // Crear un usuario vendedor de ejemplo
    const vendedorRole = await Role.findOne({ name: "Vendedor" });
    const vendedorExists = await User.findOne({ email: "vendedor@example.com" });
    if (!vendedorExists) {
      await User.create({
        name: "Vendedor",
        email: "vendedor@example.com",
        password: "vendedor123",
        role_id: vendedorRole._id,
      });
      console.log("➕ Usuario vendedor creado: vendedor@example.com");
    }

    // Inicializar colección de ventas con ejemplo si está vacía
    const saleExists = await Sale.findOne();
    if (!saleExists) {
      await Sale.create({
        product: "Producto de prueba",
        quantity: 10,
        price: 100,
        user_id: adminExists ? adminExists._id : undefined,
        date: new Date(),
      });
      console.log("➕ Venta de ejemplo creada");
    }

    console.log("✅ Base de datos soa_system inicializada correctamente");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error conectando o inicializando MongoDB Atlas:", error.message);
    process.exit(1);
  }
};

// Ejecutar la función
connectDB();
