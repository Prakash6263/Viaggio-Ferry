const mongoose = require("mongoose")

let isConnected = false

module.exports = async function connectDB() {
  const uri = process.env.MONGODB_URI
  if (!uri) {
    throw new Error("MONGODB_URI is not set. Please add it in Vars.")
  }
  if (isConnected) return mongoose.connection

  mongoose.set("strictQuery", true)
  await mongoose.connect(uri, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 15000,
  })
  isConnected = true

  mongoose.connection.on("error", (err) => {
    console.error("Mongo connection error:", err)
  })
  mongoose.connection.on("disconnected", () => {
    isConnected = false
  })

  return mongoose.connection
}
