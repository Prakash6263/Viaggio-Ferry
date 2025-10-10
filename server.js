const express = require("express")
const helmet = require("helmet")
const cors = require("cors")
const morgan = require("morgan")

const connectDB = require("./src/config/db")
const companyRoutes = require("./src/routes/companyRoutes")
const moduleRoutes = require("./src/routes/moduleRoutes")
const accessGroupRoutes = require("./src/routes/accessGroupRoutes")
const metaRoutes = require("./src/routes/metaRoutes")
const portRoutes = require("./src/routes/portRoutes") // import ports routes
const cabinRoutes = require("./src/routes/cabinRoutes") // import cabin routes
const payloadTypeRoutes = require("./src/routes/payloadTypeRoutes") // add payload types route import
const { notFound, errorHandler } = require("./src/middleware/errorHandler")

const app = express()

// Security & parsing
app.use(helmet())
app.use(cors())
app.use(express.json({ limit: "1mb" }))
app.use(express.urlencoded({ extended: true }))

// Logging
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"))

// Health
app.get("/api/health", (req, res) => res.json({ status: "ok" }))

// Routes
app.use("/api/companies", companyRoutes)
app.use("/api/modules", moduleRoutes)
app.use("/api/access-groups", accessGroupRoutes)
app.use("/api/meta", metaRoutes)
app.use("/api/ports", portRoutes) // mount /api/ports
app.use("/api/cabins", cabinRoutes) // mount /api/cabins
app.use("/api/payload-types", payloadTypeRoutes) // mount /api/payload-types

// 404 and error handling
app.use(notFound)
app.use(errorHandler)

// Start
const PORT = process.env.PORT || 3001
;(async () => {
  await connectDB()
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`)
  })
})()
