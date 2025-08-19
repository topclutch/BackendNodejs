import mongoose from "mongoose"

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI)
    console.log(`✅ MongoDB conectado: ${conn.connection.host}`)
  } catch (error) {
    console.error("❌ Error conectando a MongoDB:", error.message)
    process.exit(1)
  }
}
