const express = require("express")
const helmet = require("helmet")
const cors = require("cors")
const morgan = require("morgan")
const path = require("path")
require("dotenv").config()

const connectDB = require("./src/config/db")

const adminRoutes = require("./src/routes/adminRoutes")
const companyRoutes = require("./src/routes/companyRoutes")

const app = express()

// Security & parsing
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
)
app.use(cors())
app.use(express.json({ limit: "1mb" }))
app.use(express.urlencoded({ extended: true }))

app.use("/uploads", express.static(path.join(__dirname, "src/uploads")))

// Logging
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"))

// Health
app.get("/api/health", (req, res) => res.json({ status: "ok" }))

app.use("/api/admin", adminRoutes)
app.use("/api/companies", companyRoutes)

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
