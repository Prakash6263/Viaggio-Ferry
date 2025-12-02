const express = require("express")
const router = express.Router()
const { getCurrencies, getCurrencyByCode } = require("../controllers/currencyController")

router.get("/:companyId", getCurrencies)

router.get("/:companyId/:code", getCurrencyByCode)

module.exports = router
