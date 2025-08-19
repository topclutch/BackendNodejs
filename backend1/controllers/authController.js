import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import User from "../models/User.js"
import Role from "../models/Role.js"

// Generar JWT token
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role_id?.name || "Usuario",
      role_id: user.role_id?._id,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "24h" },
  )
}

// Login de usuario
export const login = async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email y contraseña son requeridos",
      })
    }

    // Buscar usuario con rol poblado
    const user = await User.findOne({ email, active: true }).populate("role_id", "name permissions")

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Credenciales inválidas",
      })
    }

    // Verificar contraseña
    const isValidPassword = await bcrypt.compare(password, user.password)
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: "Credenciales inválidas",
      })
    }

    // Generar token
    const token = generateToken(user)

    // Respuesta sin contraseña
    const userResponse = {
      id: user._id,
      name: user.name,
      email: user.email,
      role_id: user.role_id,
      isActive: user.active, // Added isActive field for frontend compatibility
      createdAt: user.createdAt,
    }

    res.json({
      success: true,
      message: "Login exitoso",
      data: {
        user: userResponse,
        token,
      },
    })
  } catch (error) {
    console.error("Error en login:", error)
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    })
  }
}

// Registro de usuario
export const register = async (req, res) => {
  try {
    const { name, email, password, role_id } = req.body

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Nombre, email y contraseña son requeridos",
      })
    }

    // Verificar si el usuario ya existe
    const existingUser = await User.findOne({ email, deleted: false })
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "El usuario ya existe",
      })
    }

    // Verificar que el rol existe
    let roleToAssign = role_id
    if (role_id) {
      const roleExists = await Role.findById(role_id)
      if (!roleExists) {
        return res.status(400).json({
          success: false,
          message: "Rol inválido",
        })
      }
    } else {
      // Asignar rol de Usuario por defecto
      const defaultRole = await Role.findOne({ name: "Usuario" })
      roleToAssign = defaultRole?._id
    }

    // Hash de la contraseña
    const saltRounds = 12
    const hashedPassword = await bcrypt.hash(password, saltRounds)

    // Crear usuario
    const newUser = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role_id: roleToAssign,
    })

    await newUser.save()

    // Poblar el rol para la respuesta
    await newUser.populate("role_id", "name permissions")

    // Generar token
    const token = generateToken(newUser)

    // Respuesta sin contraseña
    const userResponse = {
      id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      role_id: newUser.role_id,
      createdAt: newUser.createdAt,
    }

    res.status(201).json({
      success: true,
      message: "Usuario registrado exitosamente",
      data: {
        user: userResponse,
        token,
      },
    })
  } catch (error) {
    console.error("Error en registro:", error)
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    })
  }
}

// Obtener perfil del usuario autenticado
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate("role_id", "name permissions").select("-password")

    if (!user || !user.active) {
      return res.status(404).json({
        success: false,
        message: "Usuario no encontrado",
      })
    }

    res.json({
      success: true,
      data: {
        ...user.toObject(),
        isActive: user.active, // Added isActive field for frontend compatibility
      },
    })
  } catch (error) {
    console.error("Error obteniendo perfil:", error)
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    })
  }
}

// Logout (invalidar token del lado del cliente)
export const logout = async (req, res) => {
  res.json({
    success: true,
    message: "Logout exitoso",
  })
}
