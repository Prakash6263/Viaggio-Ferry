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
// put this near top, after require('cors') and before routes
const allowedOrigins = [
  "https://voyagian.com",
  "https://admin.voyagian.com",
  "https://company.voyagian.com",
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002"
]

app.use((req, res, next) => {
  const origin = req.headers.origin
  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin)         // echo origin
    res.setHeader("Access-Control-Allow-Credentials", "true")    // allow cookies/auth
  }

  // allow the methods and headers your client may send (including for file uploads)
  res.setHeader("Access-Control-Allow-Methods", "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS")
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  )
  // optional: expose headers to client
  res.setHeader("Access-Control-Expose-Headers", "Content-Length,Content-Range")

  // handle preflight
  if (req.method === "OPTIONS") {
    return res.status(204).end()
  }
  next()
})

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
