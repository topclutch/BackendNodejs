import mongoose from "mongoose"

const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      enum: ["Administrador", "Vendedor", "Consultor", "Almacenista"],
    },
    permissions: {
      manageUsers: {
        type: Boolean,
        default: false,
      },
      manageProducts: {
        type: Boolean,
        default: false,
      },
      viewReports: {
        type: Boolean,
        default: false,
      },
      manageSales: {
        type: Boolean,
        default: false,
      },
      manageInventory: {
        type: Boolean,
        default: false,
      },
    },
    description: {
      type: String,
      trim: true,
      maxlength: [200, "La descripción no puede exceder 200 caracteres"],
    },
  },
  {
    timestamps: true,
  },
)

const Role = mongoose.model("Role", roleSchema)

export default Role
