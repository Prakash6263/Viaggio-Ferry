const adminRoutes = require("./adminRoutes")
const companyRoutes = require("./companyRoutes")
const exchangeRateRoutes = require("./exchangeRateRoutes")
const termsAndConditionsRoutes = require("./termsAndConditionsRoutes")
const contactMessageRoutes = require("./contactMessageRoutes")
const b2cRoutes = require("./b2cRoutes") // Import B2C routes
const companyCurrencyRoutes = require("./companyCurrencyRoutes") // Add import
const currencyRoutes = require("./currencyRoutes") // Import global currency routes

module.exports = (app) => {
  app.use("/api/exchange-rates", exchangeRateRoutes)
  app.use("/api/admin", adminRoutes)
  app.use("/api/companies", companyRoutes)
  app.use("/api/companies", companyCurrencyRoutes) // Add company currency routes
  app.use("/api/currencies", currencyRoutes) // Register global currency routes
  app.use("/api/terms-and-conditions", termsAndConditionsRoutes)
  app.use("/api/contact-messages", contactMessageRoutes)
  app.use("/api/b2c", b2cRoutes) // Register B2C routes
}
