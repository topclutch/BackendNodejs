import express from "express"
import { User, Role } from "../models/index.js"
import { authenticateToken, requireRole } from "../middleware/auth.js"
import bcrypt from "bcryptjs"

const router = express.Router()

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: ID único del usuario
 *         name:
 *           type: string
 *           description: Nombre completo del usuario
 *         email:
 *           type: string
 *           format: email
 *           description: Email del usuario
 *         role:
 *           type: string
 *           description: Nombre del rol
 *         permissions:
 *           type: object
 *           description: Permisos del rol
 *         active:
 *           type: boolean
 *           description: Estado del usuario
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     CreateUserRequest:
 *       type: object
 *       required:
 *         - name
 *         - email
 *         - password
 *       properties:
 *         name:
 *           type: string
 *           description: Nombre completo del usuario
 *         email:
 *           type: string
 *           format: email
 *           description: Email del usuario
 *         password:
 *           type: string
 *           description: Contraseña del usuario
 *         role_name:
 *           type: string
 *           default: Vendedor
 *           description: Nombre del rol
 *     UpdateUserRequest:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           description: Nombre completo del usuario
 *         email:
 *           type: string
 *           format: email
 *           description: Email del usuario
 *         role_name:
 *           type: string
 *           description: Nombre del rol
 *         active:
 *           type: boolean
 *           description: Estado del usuario
 *     Role:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: ID único del rol
 *         name:
 *           type: string
 *           description: Nombre del rol
 *         description:
 *           type: string
 *           description: Descripción del rol
 *         permissions:
 *           type: object
 *           description: Permisos del rol
 */

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Obtener todos los usuarios
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de usuarios obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *                 count:
 *                   type: integer
 *       401:
 *         description: Token inválido o expirado
 *       403:
 *         description: Permisos insuficientes (solo Administrador)
 *       500:
 *         description: Error interno del servidor
 */
router.get("/", authenticateToken, requireRole(["Administrador"]), async (req, res) => {
  try {
    const users = await User.find({ active: true })
      .populate("role_id", "name permissions")
      .select("-password")
      .sort({ createdAt: -1 })

    const formattedUsers = users.map((user) => ({
      _id: user._id, // Added _id field for frontend compatibility
      id: user._id,
      name: user.name,
      email: user.email,
      role_id: user.role_id, // Added role_id object for frontend compatibility
      role: user.role_id.name,
      permissions: user.role_id.permissions,
      active: user.active,
      isActive: user.active, // Added isActive field for frontend compatibility
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }))

    res.json({
      success: true,
      data: formattedUsers,
      count: formattedUsers.length,
    })
  } catch (error) {
    console.error("Error obteniendo usuarios:", error)
    res.status(500).json({
      success: false,
      message: "Error al obtener los usuarios",
      error: error.message,
    })
  }
})

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Obtener usuario por ID
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del usuario
 *     responses:
 *       200:
 *         description: Usuario obtenido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: ID inválido
 *       401:
 *         description: Token inválido o expirado
 *       404:
 *         description: Usuario no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params

    if (!id || id === "undefined") {
      return res.status(400).json({
        success: false,
        message: "ID de usuario requerido y válido",
      })
    }

    const user = await User.findById(id).populate("role_id", "name permissions").select("-password")

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Usuario no encontrado",
      })
    }

    const formattedUser = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role_id.name,
      permissions: user.role_id.permissions,
      active: user.active,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }

    res.json({
      success: true,
      data: formattedUser,
    })
  } catch (error) {
    console.error("Error obteniendo usuario:", error)
    res.status(500).json({
      success: false,
      message: "Error al obtener el usuario",
      error: error.message,
    })
  }
})

/**
 * @swagger
 * /api/users:
 *   post:
 *     summary: Crear nuevo usuario
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateUserRequest'
 *     responses:
 *       201:
 *         description: Usuario creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *                 message:
 *                   type: string
 *       400:
 *         description: Datos inválidos o usuario ya existe
 *       401:
 *         description: Token inválido o expirado
 *       403:
 *         description: Permisos insuficientes (solo Administrador)
 *       500:
 *         description: Error interno del servidor
 */
router.post("/", authenticateToken, requireRole(["Administrador"]), async (req, res) => {
  try {
    const { name, email, password, role_name = "Vendedor" } = req.body

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Nombre, email y contraseña son requeridos",
      })
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "El usuario ya existe",
      })
    }

    // Find role
    const role = await Role.findOne({ name: role_name })
    if (!role) {
      return res.status(400).json({
        success: false,
        message: "Rol inválido",
      })
    }

    // Create user
    const user = new User({
      name,
      email,
      password,
      role_id: role._id,
      active: true,
    })

    await user.save()

    // Return user with populated role
    const populatedUser = await User.findById(user._id).populate("role_id", "name permissions").select("-password")

    const formattedUser = {
      id: populatedUser._id,
      name: populatedUser.name,
      email: populatedUser.email,
      role: populatedUser.role_id.name,
      permissions: populatedUser.role_id.permissions,
      active: populatedUser.active,
    }

    res.status(201).json({
      success: true,
      data: formattedUser,
      message: "Usuario creado exitosamente",
    })
  } catch (error) {
    console.error("Error creando usuario:", error)
    res.status(500).json({
      success: false,
      message: "Error al crear el usuario",
      error: error.message,
    })
  }
})

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Actualizar usuario
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del usuario
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateUserRequest'
 *     responses:
 *       200:
 *         description: Usuario actualizado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *                 message:
 *                   type: string
 *       400:
 *         description: ID inválido o datos incorrectos
 *       401:
 *         description: Token inválido o expirado
 *       403:
 *         description: Permisos insuficientes (solo Administrador)
 *       404:
 *         description: Usuario no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.put("/:id", authenticateToken, requireRole(["Administrador"]), async (req, res) => {
  console.log("=== DEBUG PUT /api/users/:id ===")
  console.log("ID recibido:", req.params.id)
  console.log("Tipo de ID:", typeof req.params.id)
  console.log("Body recibido:", JSON.stringify(req.body, null, 2))
  console.log("Usuario autenticado:", req.user.email)
  console.log("================================")

  try {
    const { id } = req.params

    if (!id || id === "undefined") {
      return res.status(400).json({
        success: false,
        message: "ID de usuario requerido y válido",
      })
    }

    const { email, name, role, role_name, active, isActive, password } = req.body

    const user = await User.findById(id)
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Usuario no encontrado",
      })
    }

    // Update basic fields
    if (email) user.email = email.toLowerCase().trim()
    if (name) user.name = name.trim()

    if (typeof active === "boolean") user.active = active
    if (typeof isActive === "boolean") user.active = isActive

    if (password && password.trim() !== "") {
      console.log("Actualizando contraseña...")
      // Temporarily disable the pre-save middleware by setting a flag
      user.skipPasswordHash = true
      user.password = await bcrypt.hash(password.trim(), 10)
      console.log("Contraseña hasheada manualmente")
    }

    // Update role if provided
    const roleToFind = role_name || role
    if (roleToFind) {
      const roleDoc = await Role.findOne({ name: roleToFind })
      if (!roleDoc) {
        return res.status(400).json({
          success: false,
          message: "Rol inválido",
        })
      }
      user.role_id = roleDoc._id
    }

    await user.save()
    console.log("Usuario actualizado correctamente")

    // Return updated user with populated role
    const updatedUser = await User.findById(id).populate("role_id", "name permissions").select("-password")

    const formattedUser = {
      _id: updatedUser._id, // Added _id field for frontend compatibility
      id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      role_id: updatedUser.role_id, // Added role_id object for frontend compatibility
      role: updatedUser.role_id.name,
      permissions: updatedUser.role_id.permissions,
      active: updatedUser.active,
      isActive: updatedUser.active, // Added isActive field for frontend compatibility
    }

    res.json({
      success: true,
      data: formattedUser,
      message: "Usuario actualizado exitosamente",
    })
  } catch (error) {
    console.error("Error actualizando usuario:", error)
    res.status(500).json({
      success: false,
      message: "Error al actualizar el usuario",
      error: error.message,
    })
  }
})

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Eliminar usuario (desactivar)
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del usuario
 *     responses:
 *       200:
 *         description: Usuario desactivado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: ID inválido
 *       401:
 *         description: Token inválido o expirado
 *       403:
 *         description: Permisos insuficientes (solo Administrador)
 *       404:
 *         description: Usuario no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.delete("/:id", authenticateToken, requireRole(["Administrador"]), async (req, res) => {
  try {
    const { id } = req.params

    if (!id || id === "undefined") {
      return res.status(400).json({
        success: false,
        message: "ID de usuario requerido y válido",
      })
    }

    const user = await User.findById(id)
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Usuario no encontrado",
      })
    }

    // Soft delete - just mark as inactive
    user.active = false
    await user.save()

    res.json({
      success: true,
      message: "Usuario desactivado exitosamente",
    })
  } catch (error) {
    console.error("Error eliminando usuario:", error)
    res.status(500).json({
      success: false,
      message: "Error al eliminar el usuario",
      error: error.message,
    })
  }
})

/**
 * @swagger
 * /api/users/roles/list:
 *   get:
 *     summary: Obtener todos los roles disponibles
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de roles obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Role'
 *       401:
 *         description: Token inválido o expirado
 *       403:
 *         description: Permisos insuficientes (solo Administrador)
 *       500:
 *         description: Error interno del servidor
 */
router.get("/roles/list", authenticateToken, requireRole(["Administrador"]), async (req, res) => {
  try {
    const roles = await Role.find().sort({ name: 1 })
    res.json({
      success: true,
      data: roles,
    })
  } catch (error) {
    console.error("Error obteniendo roles:", error)
    res.status(500).json({
      success: false,
      message: "Error al obtener los roles",
      error: error.message,
    })
  }
})

export default router
