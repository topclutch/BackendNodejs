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
    ];

    const createdRoles = await Role.insertMany(defaultRoles);
    console.log(`✅ ${createdRoles.length} roles creados`);
    
    // Obtener los roles creados con función helper
    const getRoleId = (name) => {
      const role = createdRoles.find(role => role.name === name);
      if (!role) {
        throw new Error(`❌ Rol '${name}' no encontrado`);
      }
      return role._id;
    };

    // ----------------------
    // 3️⃣ Crear usuarios
    // ----------------------
    console.log("👥 Creando usuarios...");
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
    ];

    // Crear usuarios uno por uno para activar middleware pre-save
    const createdUsers = [];
    for (const userData of usersData) {
      try {
        console.log(`  Creando usuario: ${userData.name}...`);
        const user = new User(userData);
        await user.save(); // Esto activa el middleware pre-save
        createdUsers.push(user);
        console.log(`  ✅ ${userData.name} creado exitosamente`);
      } catch (userError) {
        console.error(`  ❌ Error creando ${userData.name}:`, userError.message);
        if (userError.errors) {
          Object.keys(userError.errors).forEach(field => {
            console.error(`    - ${field}: ${userError.errors[field].message}`);
          });
        }
        // Continuar con el siguiente usuario
      }
    }
    console.log(`✅ ${createdUsers.length} usuarios creados exitosamente`);

    // ----------------------
    // 4️⃣ Crear ventas de ejemplo
    // ----------------------
    if (createdUsers.length > 0) {
      console.log("💰 Creando ventas de ejemplo...");
      const adminUser = createdUsers.find(user => user.email === "admin@example.com");
      const vendedorUser = createdUsers.find(user => user.email === "juan@ventas.com");

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
        ];

        try {
          const createdSales = await Sale.insertMany(sales);
          console.log(`✅ ${createdSales.length} ventas creadas`);
        } catch (salesError) {
          console.error("❌ Error creando ventas:", salesError.message);
        }
      } else {
        console.log("⚠️  No se pueden crear ventas: faltan usuarios requeridos");
      }
    } else {
      console.log("⚠️  No se crearon ventas: no hay usuarios disponibles");
    }

    // ----------------------
    // 5️⃣ Verificar datos creados
    // ----------------------
    console.log("\n📊 RESUMEN DE DATOS CREADOS:");
    console.log(`👥 Usuarios: ${await User.countDocuments()}`);
    console.log(`🔐 Roles: ${await Role.countDocuments()}`);
    console.log(`💰 Ventas: ${await Sale.countDocuments()}`);
    
    // Mostrar algunos datos si existen usuarios
    if (await User.countDocuments() > 0) {
      const allUsers = await User.find().populate('role_id');
      console.log("\n👤 USUARIOS CREADOS:");
      allUsers.forEach(user => {
        console.log(`  - ${user.name} (${user.email}) - Rol: ${user.role_id.name}`);
      });
    } else {
      console.log("\n⚠️  No se encontraron usuarios en la base de datos");
    }

    console.log("\n✅ Base de datos soa_system inicializada correctamente");
    console.log("\n🔐 CREDENCIALES DE PRUEBA:");
    console.log("📧 Administrador: admin@example.com | 🔑 admin123");
    console.log("📧 Vendedor: juan@ventas.com | 🔑 vendedor123");
    console.log("📧 Consultora: ana@consultoria.com | 🔑 consultor123");
    console.log("📧 Almacenista: pedro@almacen.com | 🔑 almacen123");
    
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