// dbInit.js
import mongoose from "mongoose";
import dotenv from "dotenv";
import Role from "./models/Role.js";
import User from "./models/User.js";
import Sale from "./models/Sale.js";

dotenv.config();

const connectDB = async () => {
  try {
    // IMPORTANTE: Asegúrate de que tu MONGO_URI incluya la base de datos soa_system
    // Ejemplo: mongodb+srv://usuario:password@cluster.mongodb.net/soa_system?retryWrites=true&w=majority
    
    console.log("🔄 Conectando a MongoDB Atlas...");
    console.log(`📝 URI: ${process.env.MONGO_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`);
    
    await mongoose.connect(process.env.MONGO_URI);
    
    console.log(`✅ Conectado a MongoDB Atlas: ${mongoose.connection.host}`);
    console.log(`📂 Base de datos usada: ${mongoose.connection.name}`);
    
    // Verificar que estamos en la base de datos correcta
    if (mongoose.connection.name !== 'soa_system') {
      console.log(`⚠️  ADVERTENCIA: Se esperaba 'soa_system' pero se está usando '${mongoose.connection.name}'`);
    }

    // ----------------------
    // 1️⃣ Limpiar datos existentes (opcional para testing)
    // ----------------------
    console.log("🧹 Limpiando datos existentes...");
    await Role.deleteMany({});
    await User.deleteMany({});
    await Sale.deleteMany({});
    console.log("✅ Datos anteriores eliminados");

    // ----------------------
    // 2️⃣ Crear roles
    // ----------------------
    console.log("📝 Creando roles...");
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

    const createdRoles = await Role.insertMany(defaultRoles);
    console.log(`✅ ${createdRoles.length} roles creados`);
    
    // Obtener los roles creados
    const adminRole = createdRoles.find(role => role.name === "Administrador");
    const sellerRole = createdRoles.find(role => role.name === "Vendedor");

    // ----------------------
    // 3️⃣ Crear usuarios
    // ----------------------
    console.log("👥 Creando usuarios...");
    const users = [
      {
        name: "Admin",
        email: "admin@example.com",
        password: "admin123", // Asegúrate de que tu modelo hashee la contraseña
        role_id: adminRole._id,
      },
      {
        name: "Vendedor 1",
        email: "vendedor@example.com",
        password: "vendedor123",
        role_id: sellerRole._id,
      }
    ];

    const createdUsers = await User.insertMany(users);
    console.log(`✅ ${createdUsers.length} usuarios creados`);

    // ----------------------
    // 4️⃣ Crear ventas de ejemplo
    // ----------------------
    console.log("💰 Creando ventas de ejemplo...");
    const adminUser = createdUsers.find(user => user.email === "admin@example.com");
    const vendedorUser = createdUsers.find(user => user.email === "vendedor@example.com");

    const sales = [
      { 
        product: "Producto A", 
        quantity: 10, 
        price: 100, 
        createdBy: adminUser._id 
      },
      { 
        product: "Producto B", 
        quantity: 5, 
        price: 200, 
        createdBy: vendedorUser._id 
      },
      { 
        product: "Producto C", 
        quantity: 8, 
        price: 150, 
        createdBy: vendedorUser._id 
      }
    ];

    const createdSales = await Sale.insertMany(sales);
    console.log(`✅ ${createdSales.length} ventas creadas`);

    // ----------------------
    // 5️⃣ Verificar datos creados
    // ----------------------
    console.log("\n📊 RESUMEN DE DATOS CREADOS:");
    console.log(`👥 Usuarios: ${await User.countDocuments()}`);
    console.log(`🔐 Roles: ${await Role.countDocuments()}`);
    console.log(`💰 Ventas: ${await Sale.countDocuments()}`);
    
    // Mostrar algunos datos
    const allUsers = await User.find().populate('role_id');
    console.log("\n👤 USUARIOS CREADOS:");
    allUsers.forEach(user => {
      console.log(`  - ${user.name} (${user.email}) - Rol: ${user.role_id.name}`);
    });

    console.log("\n✅ Base de datos soa_system inicializada correctamente");
    
  } catch (error) {
    console.error("❌ Error conectando o inicializando MongoDB Atlas:", error);
    console.error("Stack trace:", error.stack);
    process.exit(1);
  } finally {
    // Cerrar conexión
    await mongoose.connection.close();
    console.log("🔌 Conexión cerrada");
    process.exit(0);
  }
};

// Ejecutar la función
connectDB();