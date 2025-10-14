const express = require("express")
const helmet = require("helmet")
const cors = require("cors")
const morgan = require("morgan")
require("dotenv").config() // load environment variables for local development

const connectDB = require("./src/config/db")
const companyRoutes = require("./src/routes/companyRoutes")
const moduleRoutes = require("./src/routes/moduleRoutes")
const accessGroupRoutes = require("./src/routes/accessGroupRoutes")
const metaRoutes = require("./src/routes/metaRoutes")
const portRoutes = require("./src/routes/portRoutes") // import ports routes
const cabinRoutes = require("./src/routes/cabinRoutes") // import cabin routes
const payloadTypeRoutes = require("./src/routes/payloadTypeRoutes") // add payload types route import
const userRoutes = require("./src/routes/userRoutes") // add user routes import
const agentRoutes = require("./src/routes/agentRoutes") // add agent routes import
const currencyRoutes = require("./src/routes/currencyRoutes") // import currency routes
const taxRoutes = require("./src/routes/taxRoutes") // import tax routes
const promotionRoutes = require("./src/routes/promotionRoutes") // import promotions routes
const contactMessageRoutes = require("./src/routes/contactMessageRoutes") // import contact message routes
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
app.use("/api/users", userRoutes) // mount /api/users
app.use("/api/agents", agentRoutes) // mount /api/agents
app.use("/api/currencies", currencyRoutes) // mount /api/currencies
app.use("/api/taxes", taxRoutes) // mount /api/taxes
app.use("/api/promotions", promotionRoutes) // mount /api/promotions
app.use("/api/contact-messages", contactMessageRoutes) // mount /api/contact-messages

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
