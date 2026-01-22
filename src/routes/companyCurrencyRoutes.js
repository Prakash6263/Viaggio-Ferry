const express = require("express")
const router = express.Router()
const companyCurrencyController = require("../controllers/companyCurrencyController")
const { verifyToken, extractCompanyId, extractUserId } = require("../middleware/authMiddleware")
const { checkPermission } = require("../middleware/permissionMiddleware")

// ==================== AUTHENTICATION MIDDLEWARE ====================
router.use(verifyToken)
router.use(extractCompanyId)
router.use(extractUserId)

// ==================== COMPANY CURRENCY ROUTES ====================

/**
 * POST /api/companies/:companyId/currencies
 * Add currency to company - requires write permission on currency submodule
 */
router.post(
  "/:companyId/currencies",
  checkPermission("administration", "currency", "write"),
  companyCurrencyController.addCurrencyToCompany
)

/**
 * GET /api/companies/:companyId/currencies
 * Get all currencies for a company - requires read permission on currency submodule
 */
router.get(
  "/:companyId/currencies",
  checkPermission("administration", "currency", "read"),
  companyCurrencyController.getCompanyCurrencies
)

/**
 * GET /api/companies/:companyId/currencies/:currencyId
 * Get single currency details - requires read permission on currency submodule
 */
router.get(
  "/:companyId/currencies/:currencyId",
  checkPermission("administration", "currency", "read"),
  companyCurrencyController.getCompanyCurrencyById
)

/**
 * POST /api/companies/:companyId/currencies/:currencyId/rates
 * Add/Update exchange rate - requires write permission on currency submodule
 */
router.post(
  "/:companyId/currencies/:currencyId/rates",
  checkPermission("administration", "currency", "write"),
  companyCurrencyController.addExchangeRate
)

/**
 * GET /api/companies/:companyId/currencies/:currencyId/rates
 * Get exchange rate history - requires read permission on currency submodule
 */
router.get(
  "/:companyId/currencies/:currencyId/rates",
  checkPermission("administration", "currency", "read"),
  companyCurrencyController.getExchangeRateHistory
)

/**
 * DELETE /api/companies/:companyId/currencies/:currencyId
 * Delete currency - requires delete permission on currency submodule
 */
router.delete(
  "/:companyId/currencies/:currencyId",
  checkPermission("administration", "currency", "delete"),
  companyCurrencyController.deleteCompanyCurrency
)

module.exports = router
