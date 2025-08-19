import User from "../models/User.js"
import Role from "../models/Role.js"
import bcrypt from "bcryptjs"

// Obtener todos los usuarios
export const getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "", role = "" } = req.query

    // Construir filtro
    const filter = { deleted: false }

    if (search) {
      filter.$or = [{ name: { $regex: search, $options: "i" } }, { email: { $regex: search, $options: "i" } }]
    }

    if (role) {
      const roleDoc = await Role.findOne({ name: role })
      if (roleDoc) {
        filter.role_id = roleDoc._id
      }
    }

    // Paginación
    const skip = (Number.parseInt(page) - 1) * Number.parseInt(limit)

    const users = await User.find(filter)
      .populate("role_id", "name permissions")
      .select("-password")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number.parseInt(limit))

    const total = await User.countDocuments(filter)

    res.json({
      success: true,
      data: users,
      pagination: {
        current_page: Number.parseInt(page),
        per_page: Number.parseInt(limit),
        total,
        total_pages: Math.ceil(total / Number.parseInt(limit)),
      },
    })
  } catch (error) {
    console.error("Error obteniendo usuarios:", error)
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    })
  }
}

// Obtener usuario por ID
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params

    const user = await User.findOne({ _id: id, deleted: false })
      .populate("role_id", "name permissions")
      .select("-password")

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Usuario no encontrado",
      })
    }

    res.json({
      success: true,
      data: user,
    })
  } catch (error) {
    console.error("Error obteniendo usuario:", error)
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    })
  }
}

// Actualizar usuario
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params
    const { name, email, role_id, password } = req.body

    // Verificar que el usuario existe
    const user = await User.findOne({ _id: id, deleted: false })
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Usuario no encontrado",
      })
    }

    // Verificar permisos (solo admin o el mismo usuario)
    if (req.user.role !== "Administrador" && req.user.id !== id) {
      return res.status(403).json({
        success: false,
        message: "No tienes permisos para actualizar este usuario",
      })
    }

    // Construir objeto de actualización
    const updateData = {}

    if (name) updateData.name = name.trim()
    if (email) {
      // Verificar que el email no esté en uso
      const emailExists = await User.findOne({
        email: email.toLowerCase().trim(),
        _id: { $ne: id },
        deleted: false,
      })
      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: "El email ya está en uso",
        })
      }
      updateData.email = email.toLowerCase().trim()
    }

    // Solo admin puede cambiar roles
    if (role_id && req.user.role === "Administrador") {
      const roleExists = await Role.findById(role_id)
      if (!roleExists) {
        return res.status(400).json({
          success: false,
          message: "Rol inválido",
        })
      }
      updateData.role_id = role_id
    }

    // Actualizar contraseña si se proporciona
    if (password) {
      const saltRounds = 12
      updateData.password = await bcrypt.hash(password, saltRounds)
    }

    updateData.updatedAt = new Date()

    // Actualizar usuario
    const updatedUser = await User.findByIdAndUpdate(id, updateData, { new: true, runValidators: true })
      .populate("role_id", "name permissions")
      .select("-password")

    res.json({
      success: true,
      message: "Usuario actualizado exitosamente",
      data: updatedUser,
    })
  } catch (error) {
    console.error("Error actualizando usuario:", error)
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    })
  }
}

// Eliminar usuario (soft delete)
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params

    // Solo admin puede eliminar usuarios
    if (req.user.role !== "Administrador") {
      return res.status(403).json({
        success: false,
        message: "No tienes permisos para eliminar usuarios",
      })
    }

    // No permitir auto-eliminación
    if (req.user.id === id) {
      return res.status(400).json({
        success: false,
        message: "No puedes eliminar tu propia cuenta",
      })
    }

    const user = await User.findOne({ _id: id, deleted: false })
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Usuario no encontrado",
      })
    }

    // Soft delete
    await User.findByIdAndUpdate(id, {
      deleted: true,
      deletedAt: new Date(),
    })

    res.json({
      success: true,
      message: "Usuario eliminado exitosamente",
    })
  } catch (error) {
    console.error("Error eliminando usuario:", error)
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    })
  }
}

// Obtener roles disponibles
export const getRoles = async (req, res) => {
  try {
    const roles = await Role.find().select("name permissions description")

    res.json({
      success: true,
      data: roles,
    })
  } catch (error) {
    console.error("Error obteniendo roles:", error)
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    })
  }
}
