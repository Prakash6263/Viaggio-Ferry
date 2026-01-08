const adminRoutes = require("./adminRoutes")
const companyRoutes = require("./companyRoutes")
const ledgerRoutes = require("./ledgerRoutes") // Added ledger routes import
const exchangeRateRoutes = require("./exchangeRateRoutes")
const termsAndConditionsRoutes = require("./termsAndConditionsRoutes")
const contactMessageRoutes = require("./contactMessageRoutes")
const b2cRoutes = require("./b2cRoutes")
const companyCurrencyRoutes = require("./companyCurrencyRoutes")
const currencyRoutes = require("./currencyRoutes")

module.exports = (app) => {
  app.use("/api/exchange-rates", exchangeRateRoutes)
  app.use("/api/admin", adminRoutes)
  app.use("/api/companies", companyRoutes)
  app.use("/api/ledgers", ledgerRoutes) // Added ledger routes registration
  app.use("/api/companies", companyCurrencyRoutes)
  app.use("/api/currencies", currencyRoutes)
  app.use("/api/terms-and-conditions", termsAndConditionsRoutes)
  app.use("/api/contact-messages", contactMessageRoutes)
  app.use("/api/b2c", b2cRoutes)
}
