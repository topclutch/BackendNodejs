import mongoose from "mongoose"

const saleProductSchema = new mongoose.Schema(
  {
    productId: {
      type: Number,
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, "La cantidad debe ser mayor a 0"],
    },
    price: {
      type: Number,
      required: true,
      min: [0, "El precio debe ser mayor o igual a 0"],
    },
    purchase_price: {
      type: Number,
      required: false,
      min: [0, "El precio de compra debe ser mayor o igual a 0"],
    },
    profit: {
      type: Number,
      required: false,
      min: [0, "La ganancia debe ser mayor o igual a 0"],
    },
  },
  { _id: false },
)

const saleSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    client: {
      type: String,
      required: true,
      trim: true,
      minlength: [2, "El nombre del cliente debe tener al menos 2 caracteres"],
      maxlength: [100, "El nombre del cliente no puede exceder 100 caracteres"]
    },
    products: {
      type: [saleProductSchema],
      validate: [(arr) => arr.length > 0, "Debe haber al menos un producto"],
    },
    total: {
      type: Number,
      min: [0, "El total debe ser mayor o igual a 0"],
      required: true,
    },
    total_profit: {
      type: Number,
      min: [0, "La ganancia total debe ser mayor o igual a 0"],
      default: 0,
    },
    status: {
      type: String,
      enum: ["pending", "completed", "cancelled", "failed"],
      default: "pending",
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, "Las notas no pueden exceder 1000 caracteres"],
    },
  },
  {
    timestamps: true,
  },
)

// Middleware para calcular el total automáticamente
saleSchema.pre("save", function (next) {
  if (this.products && this.products.length > 0) {
    this.total = this.products.reduce((sum, product) => {
      return sum + product.quantity * product.price
    }, 0)
  }
  next()
})

const Sale = mongoose.model("Sale", saleSchema)

export default Sale