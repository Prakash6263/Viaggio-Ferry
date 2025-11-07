const { param, query, body } = require("express-validator")
const { validate } = require("../middleware/validationMiddleware")

const getTrialBalanceValidation = [
  param("companyId").isMongoId().withMessage("Invalid company ID"),
  query("page").optional().isInt({ min: 1 }).withMessage("Page must be a positive integer"),
  query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("Limit must be between 1 and 100"),
  query("searchTerm").optional().trim(),
  query("accountType").optional().trim(),
  query("balanceStatus").optional().isIn(["Debit", "Credit", "Balanced", "All Balances"]),
  query("dateFilter").optional().isIn(["All Dates", "Today", "This Month", "This Year"]),
  query("asOfDate").optional().isISO8601().withMessage("As of date must be a valid ISO date"),
  query("startDate").optional().isISO8601().withMessage("Start date must be a valid ISO date"),
  query("endDate").optional().isISO8601().withMessage("End date must be a valid ISO date"),
  validate,
]

const refreshTrialBalanceValidation = [
  param("companyId").isMongoId().withMessage("Invalid company ID"),
  body("asOfDate").isISO8601().withMessage("asOfDate must be a valid ISO date"),
  validate,
]

const exportTrialBalanceValidation = [
  param("companyId").isMongoId().withMessage("Invalid company ID"),
  query("asOfDate").optional().isISO8601().withMessage("As of date must be a valid ISO date"),
  query("accountType").optional().trim(),
  query("balanceStatus").optional().isIn(["Debit", "Credit", "Balanced", "All Balances"]),
  validate,
]

const getTrialBalanceSummaryValidation = [
  param("companyId").isMongoId().withMessage("Invalid company ID"),
  query("asOfDate").optional().isISO8601().withMessage("As of date must be a valid ISO date"),
  validate,
]

const getAccountTypesValidation = [param("companyId").isMongoId().withMessage("Invalid company ID"), validate]

module.exports = {
  getTrialBalanceValidation,
  refreshTrialBalanceValidation,
  exportTrialBalanceValidation,
  getTrialBalanceSummaryValidation,
  getAccountTypesValidation,
}
