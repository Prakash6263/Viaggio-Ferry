const { body, param, query, validationResult } = require("express-validator")
const { CHART_OF_ACCOUNT_STATUS, CHART_OF_ACCOUNT_LEDGER_TYPES } = require("../models/ChartOfAccount")

const validate = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() })
  }
  next()
}

const createChartOfAccountValidation = [
  body("ledgerCode")
    .isString()
    .trim()
    .toUpperCase()
    .matches(/^[A-Z0-9]{2,20}$/)
    .withMessage("ledgerCode must be 2-20 uppercase alphanumerics"),
  body("ledgerDescription").isString().trim().notEmpty().withMessage("ledgerDescription is required"),
  body("ledgerType")
    .isIn(CHART_OF_ACCOUNT_LEDGER_TYPES)
    .withMessage(`ledgerType must be one of: ${CHART_OF_ACCOUNT_LEDGER_TYPES.join(", ")}`),
  body("typeSequence").isString().trim().notEmpty().withMessage("typeSequence is required"),
  body("status")
    .optional()
    .isIn(CHART_OF_ACCOUNT_STATUS)
    .withMessage(`status must be one of: ${CHART_OF_ACCOUNT_STATUS.join(", ")}`),
  body("systemAccount").optional().isBoolean(),
  body("partnerAccount").optional().isString().trim(),
  body("notes").optional().isString().isLength({ max: 2000 }),
  validate,
]

const updateChartOfAccountValidation = [
  param("id").isMongoId().withMessage("invalid chart of account id"),
  body("ledgerCode")
    .optional()
    .isString()
    .trim()
    .toUpperCase()
    .matches(/^[A-Z0-9]{2,20}$/),
  body("ledgerDescription").optional().isString().trim().notEmpty(),
  body("ledgerType").optional().isIn(CHART_OF_ACCOUNT_LEDGER_TYPES),
  body("typeSequence").optional().isString().trim().notEmpty(),
  body("status").optional().isIn(CHART_OF_ACCOUNT_STATUS),
  body("systemAccount").optional().isBoolean(),
  body("partnerAccount").optional().isString().trim(),
  body("notes").optional().isString().isLength({ max: 2000 }),
  validate,
]

const idParamValidation = [param("id").isMongoId().withMessage("invalid chart of account id"), validate]

const listChartOfAccountsValidation = [
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
  query("q").optional().isString().trim(),
  query("ledgerType").optional().isIn(CHART_OF_ACCOUNT_LEDGER_TYPES),
  query("status").optional().isIn(CHART_OF_ACCOUNT_STATUS),
  query("sortBy")
    .optional()
    .isIn(["ledgerCode", "ledgerDescription", "ledgerType", "status", "createdAt", "updatedAt"]),
  query("sortOrder").optional().isIn(["asc", "desc"]),
  validate,
]

module.exports = {
  createChartOfAccountValidation,
  updateChartOfAccountValidation,
  idParamValidation,
  listChartOfAccountsValidation,
}
