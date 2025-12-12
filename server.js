const express = require("express")
const helmet = require("helmet")
const cors = require("cors")
const morgan = require("morgan")
const path = require("path")
require("dotenv").config()

const connectDB = require("./src/config/db")
const setupRoutes = require("./src/routes")

const app = express()

// Security & parsing
app.use(helmet())
app.use(
  cors({
    origin: [
      "https://voyagian.com",
      "https://admin.voyagian.com",
      "https://company.voyagian.com",
      "http://localhost:3000",
      "http://localhost:3001",
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
  })
)

app.use(express.json({ limit: "1mb" }))
app.use(express.urlencoded({ extended: true }))

app.use("/uploads", express.static(path.join(__dirname, "src/uploads")))

// Logging
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"))

// Health
app.get("/api/health", (req, res) => res.json({ status: "ok" }))

setupRoutes(app)

app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
    error: process.env.NODE_ENV === "development" ? err : {},
  })
})

const PORT = process.env.PORT || 3001
;(async () => {
  await connectDB()
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`)
  })
})()
