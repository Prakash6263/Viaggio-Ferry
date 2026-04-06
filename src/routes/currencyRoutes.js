const express = require("express")
const router = express.Router()
const { getCurrencies, getCurrencyByCode, getGlobalCurrencyCodes } = require("../controllers/currencyController")

router.get("/codes", getGlobalCurrencyCodes)
router.get("/", getCurrencies)
router.get("/:code", getCurrencyByCode)

module.exports = router
