const router = require("express").Router()
const ctrl = require("../controllers/currencyController")
const {
  createCurrencyValidation,
  updateCurrencyValidation,
  listCurrenciesValidation,
  idParamValidation,
  addRateValidation,
  removeRateValidation,
  effectiveRateValidation,
} = require("../validators/currencyValidators")

// List + Create
router.get("/", listCurrenciesValidation, ctrl.listCurrencies)
router.post("/", createCurrencyValidation, ctrl.createCurrency)

// Read / Update / Delete
router.get("/:id", idParamValidation, ctrl.getCurrency)
router.patch("/:id", updateCurrencyValidation, ctrl.updateCurrency)
router.delete("/:id", idParamValidation, ctrl.deleteCurrency)

// Rates management
router.post("/:id/rates", addRateValidation, ctrl.addRate)
router.delete("/:id/rates/:rateId", removeRateValidation, ctrl.removeRate)

// Effective rate at a date-time by code (used by UI when changing datetime)
router.get("/:code/effective-rate", effectiveRateValidation, ctrl.effectiveRate)

module.exports = router
