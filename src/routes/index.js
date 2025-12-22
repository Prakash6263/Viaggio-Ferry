const adminRoutes = require("./adminRoutes")
const companyRoutes = require("./companyRoutes")
const exchangeRateRoutes = require("./exchangeRateRoutes")
const termsAndConditionsRoutes = require("./termsAndConditionsRoutes")
const whoWeAreRoutes = require("./whoWeAreRoutes")

module.exports = (app) => {
  app.use("/api/exchange-rates", exchangeRateRoutes)
  app.use("/api/admin", adminRoutes)
  app.use("/api/companies", companyRoutes)
  app.use("/api/terms-and-conditions", termsAndConditionsRoutes)
  app.use("/api/who-we-are", whoWeAreRoutes)
}
