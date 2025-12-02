const adminRoutes = require("./adminRoutes")
const companyRoutes = require("./companyRoutes")
const exchangeRateRoutes = require("./exchangeRateRoutes")

module.exports = (app) => {
  app.use("/api/exchange-rates", exchangeRateRoutes)
  app.use("/api/admin", adminRoutes)
  app.use("/api/companies", companyRoutes)
}
