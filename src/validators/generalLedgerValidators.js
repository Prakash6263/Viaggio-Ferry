const { param, query } = require("express-validator")
const { validate } = require("../middleware/validationMiddleware")

const getGeneralLedgerValidation = [
  query("page").optional().isInt({ min: 1 }).withMessage("Page must be a positive integer"),
  query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("Limit must be between 1 and 100"),
  query("startDate").optional().isISO8601().withMessage("Start date must be a valid ISO date"),
  query("endDate").optional().isISO8601().withMessage("End date must be a valid ISO date"),
  query("ledgerCode").optional().trim(),
  query("layer").optional().isIn(["Main", "Sub"]).withMessage("Layer must be Main or Sub"),
  query("partner").optional().isMongoId().withMessage("Invalid partner ID"),
  query("status").optional().isIn(["Posted", "Cancelled"]).withMessage("Invalid status"),
  validate,
]

const getAccountLedgerValidation = [
  param("companyId").isMongoId().withMessage("Invalid company ID"),
  param("ledgerId").isMongoId().withMessage("Invalid ledger ID"),
  query("page").optional().isInt({ min: 1 }).withMessage("Page must be a positive integer"),
  query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("Limit must be between 1 and 100"),
  query("startDate").optional().isISO8601().withMessage("Start date must be a valid ISO date"),
  query("endDate").optional().isISO8601().withMessage("End date must be a valid ISO date"),
  validate,
]

const getTrialBalanceValidation = [
  param("companyId").isMongoId().withMessage("Invalid company ID"),
  query("asOfDate").optional().isISO8601().withMessage("As of date must be a valid ISO date"),
  validate,
]

const exportLedgerValidation = [
  param("companyId").isMongoId().withMessage("Invalid company ID"),
  query("startDate").optional().isISO8601().withMessage("Start date must be a valid ISO date"),
  query("endDate").optional().isISO8601().withMessage("End date must be a valid ISO date"),
  query("format").optional().isIn(["csv", "excel"]).withMessage("Format must be csv or excel"),
  validate,
]

module.exports = {
  getGeneralLedgerValidation,
  getAccountLedgerValidation,
  getTrialBalanceValidation,
  exportLedgerValidation,
}
