const { body, param, query, validationResult } = require("express-validator")
const { PERIOD_TYPES, PERIOD_STATUS } = require("../models/FiscalYear")

// Custom middleware for validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation error",
      errors: errors.array().map((err) => ({
        field: err.path,
        message: err.msg,
      })),
    })
  }
  next()
}

// Get all fiscal years validation
exports.getAllFiscalYearsValidation = [
  param("companyId").isMongoId().withMessage("Invalid company ID"),
  query("status").optional().isIn(["Open", "Closed", "Locked"]).withMessage("Invalid status"),
  query("page").optional().isInt({ min: 1 }).withMessage("Page must be >= 1"),
  query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("Limit must be 1-100"),
  handleValidationErrors,
]

// Get fiscal year details validation
exports.getFiscalYearDetailsValidation = [
  param("companyId").isMongoId().withMessage("Invalid company ID"),
  param("fiscalYearId").isMongoId().withMessage("Invalid fiscal year ID"),
  handleValidationErrors,
]

// Create fiscal year validation
exports.createFiscalYearValidation = [
  param("companyId").isMongoId().withMessage("Invalid company ID"),
  body("fiscalYear").isInt({ min: 1900, max: 2100 }).withMessage("Fiscal year must be between 1900 and 2100"),
  body("returnEarningAccount").isMongoId().withMessage("Invalid return earning account ID"),
  body("periods")
    .isArray({ min: 1 })
    .withMessage("At least one period is required")
    .custom((periods) => {
      if (!Array.isArray(periods)) return false
      return periods.every(
        (p) =>
          p.periodNo &&
          typeof p.periodNo === "number" &&
          p.startDate &&
          p.endDate &&
          PERIOD_TYPES.includes(p.type || "Normal"),
      )
    })
    .withMessage("Each period must have periodNo, startDate, endDate, and valid type"),
  handleValidationErrors,
]

// Update periods validation
exports.updatePeriodsValidation = [
  param("companyId").isMongoId().withMessage("Invalid company ID"),
  param("fiscalYearId").isMongoId().withMessage("Invalid fiscal year ID"),
  body("periods")
    .isArray({ min: 1 })
    .withMessage("At least one period is required")
    .custom((periods) => {
      if (!Array.isArray(periods)) return false
      return periods.every(
        (p) =>
          p.periodNo &&
          typeof p.periodNo === "number" &&
          p.startDate &&
          p.endDate &&
          PERIOD_TYPES.includes(p.type || "Normal") &&
          PERIOD_STATUS.includes(p.status || "Open"),
      )
    })
    .withMessage("Invalid period structure"),
  handleValidationErrors,
]

// Close period validation
exports.closePeriodValidation = [
  param("companyId").isMongoId().withMessage("Invalid company ID"),
  param("fiscalYearId").isMongoId().withMessage("Invalid fiscal year ID"),
  param("periodId").isMongoId().withMessage("Invalid period ID"),
  handleValidationErrors,
]

// Close fiscal year validation
exports.closeFiscalYearValidation = [
  param("companyId").isMongoId().withMessage("Invalid company ID"),
  param("fiscalYearId").isMongoId().withMessage("Invalid fiscal year ID"),
  handleValidationErrors,
]

// Delete fiscal year validation
exports.deleteFiscalYearValidation = [
  param("companyId").isMongoId().withMessage("Invalid company ID"),
  param("fiscalYearId").isMongoId().withMessage("Invalid fiscal year ID"),
  handleValidationErrors,
]

// Get active period validation
exports.getActivePeriodValidation = [
  param("companyId").isMongoId().withMessage("Invalid company ID"),
  handleValidationErrors,
]
