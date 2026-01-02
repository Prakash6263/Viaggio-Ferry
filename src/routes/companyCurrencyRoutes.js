const express = require("express")
const router = express.Router()
const companyCurrencyController = require("../controllers/companyCurrencyController")
const { verifyToken } = require("../middleware/authMiddleware")

// POST - Add currency to company
router.post("/:companyId/currencies", verifyToken, companyCurrencyController.addCurrencyToCompany)

// GET - Get all currencies for a company
router.get("/:companyId/currencies", verifyToken, companyCurrencyController.getCompanyCurrencies)

// GET - Get single currency details
router.get("/:companyId/currencies/:currencyId", verifyToken, companyCurrencyController.getCompanyCurrencyById)

// POST - Add/Update exchange rate
router.post("/:companyId/currencies/:currencyId/rates", verifyToken, companyCurrencyController.addExchangeRate)

// GET - Get exchange rate history
router.get("/:companyId/currencies/:currencyId/rates", verifyToken, companyCurrencyController.getExchangeRateHistory)

// DELETE - Delete currency
router.delete("/:companyId/currencies/:currencyId", verifyToken, companyCurrencyController.deleteCompanyCurrency)

module.exports = router
