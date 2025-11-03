const express = require("express")
const helmet = require("helmet")
const cors = require("cors")
const morgan = require("morgan")
require("dotenv").config()

const connectDB = require("./src/config/db")
const companyRoutes = require("./src/routes/companyRoutes")
const companyAuthRoutes = require("./src/routes/companyAuthRoutes")
const companyDashboardRoutes = require("./src/routes/companyDashboardRoutes")
const moduleRoutes = require("./src/routes/moduleRoutes")
const accessGroupRoutes = require("./src/routes/accessGroupRoutes")
const metaRoutes = require("./src/routes/metaRoutes")
const portRoutes = require("./src/routes/portRoutes")
const cabinRoutes = require("./src/routes/cabinRoutes")
const payloadTypeRoutes = require("./src/routes/payloadTypeRoutes")
const userRoutes = require("./src/routes/userRoutes")
const agentRoutes = require("./src/routes/agentRoutes")
const currencyRoutes = require("./src/routes/currencyRoutes")
const taxRoutes = require("./src/routes/taxRoutes")
const promotionRoutes = require("./src/routes/promotionRoutes")
const partnerRoutes = require("./src/routes/partnerRoutes")
const b2cCustomerRoutes = require("./src/routes/b2cCustomerRoutes")
const markupDiscountRuleRoutes = require("./src/routes/markupDiscountRuleRoutes")
const commissionRuleRoutes = require("./src/routes/commissionRuleRoutes")
const priceListRoutes = require("./src/routes/priceListRoutes")
const tripRoutes = require("./src/routes/tripRoutes")
const shipRoutes = require("./src/routes/shipRoutes")
const superAdminRoutes = require("./src/routes/superAdminRoutes")
const superAdminCompanyRoutes = require("./src/routes/superAdminCompanyRoutes")
const chartOfAccountRoutes = require("./src/routes/chartOfAccountRoutes")
const bankCashAccountRoutes = require("./src/routes/bankCashAccountRoutes")
const journalEntryRoutes = require("./src/routes/journalEntryRoutes")
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
app.use("/api/superadmin", superAdminRoutes)
app.use("/api/company-auth", companyAuthRoutes)
app.use("/api/superadmin/companies", superAdminCompanyRoutes)
app.use("/api/company-dashboard", companyDashboardRoutes)
app.use("/api/companies", companyRoutes)
app.use("/api/modules", moduleRoutes)
app.use("/api/access-groups", accessGroupRoutes)
app.use("/api/meta", metaRoutes)
app.use("/api/ports", portRoutes)
app.use("/api/cabins", cabinRoutes)
app.use("/api/payload-types", payloadTypeRoutes)
app.use("/api/users", userRoutes)
app.use("/api/agents", agentRoutes)
app.use("/api/currencies", currencyRoutes)
app.use("/api/taxes", taxRoutes)
app.use("/api/promotions", promotionRoutes)
app.use("/api/partners", partnerRoutes)
app.use("/api/b2c-customers", b2cCustomerRoutes)
app.use("/api/markup-discount-rules", markupDiscountRuleRoutes)
app.use("/api/commission-rules", commissionRuleRoutes)
app.use("/api/price-lists", priceListRoutes)
app.use("/api/trips", tripRoutes)
app.use("/api/ships", shipRoutes)
app.use("/api/chart-of-accounts", chartOfAccountRoutes)
app.use("/api/bank-cash-accounts", bankCashAccountRoutes)
app.use("/api/journal-entries", journalEntryRoutes)

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
