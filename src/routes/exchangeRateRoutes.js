const express = require("express")
const { getAllCurrencies, getExchangeRate, getMultipleExchangeRates } = require("../controllers/exchangeRateController")

const router = express.Router()

router.get("/currencies", getAllCurrencies)

// Usage: /api/exchange-rates/USD?toCurrency=EUR
router.get("/:fromCurrency", getExchangeRate)

// Usage: /api/exchange-rates/USD/multiple?toCurrencies=EUR,GBP,INR
router.get("/:fromCurrency/multiple", getMultipleExchangeRates)

module.exports = router
