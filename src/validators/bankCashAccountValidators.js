const { body, param, query, validationResult } = require("express-validator")
const {
  BANK_CASH_ACCOUNT_TYPES,
  BANK_CASH_ACCOUNT_STATUS,
  BANK_CASH_ACCOUNT_CURRENCIES,
} = require("../models/BankCashAccount")

const validate = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() })
  }
  next()
}

const createBankCashAccountValidation = [
  body("layer").isString().trim().notEmpty().withMessage("layer is required"),
  body("partnerAccount").optional().isString().trim(),
  body("accountType")
    .isIn(BANK_CASH_ACCOUNT_TYPES)
    .withMessage(`accountType must be one of: ${BANK_CASH_ACCOUNT_TYPES.join(", ")}`),
  body("accountName").isString().trim().notEmpty().withMessage("accountName is required"),
  body("bankAccountNo").optional().isString().trim(),
  body("currency")
    .optional()
    .isIn(BANK_CASH_ACCOUNT_CURRENCIES)
    .withMessage(`currency must be one of: ${BANK_CASH_ACCOUNT_CURRENCIES.join(", ")}`),
  body("ledgerCode")
    .isString()
    .trim()
    .toUpperCase()
    .matches(/^[A-Z0-9]{2,20}$/)
    .withMessage("ledgerCode must be 2-20 uppercase alphanumerics"),
  body("chartOfAccount").optional().isMongoId().withMessage("invalid chartOfAccount id"),
  body("status")
    .optional()
    .isIn(BANK_CASH_ACCOUNT_STATUS)
    .withMessage(`status must be one of: ${BANK_CASH_ACCOUNT_STATUS.join(", ")}`),
  body("note").optional().isString().isLength({ max: 2000 }),
  validate,
]

const updateBankCashAccountValidation = [
  param("id").isMongoId().withMessage("invalid bank cash account id"),
  body("layer").optional().isString().trim().notEmpty(),
  body("partnerAccount").optional().isString().trim(),
  body("accountType").optional().isIn(BANK_CASH_ACCOUNT_TYPES),
  body("accountName").optional().isString().trim().notEmpty(),
  body("bankAccountNo").optional().isString().trim(),
  body("currency").optional().isIn(BANK_CASH_ACCOUNT_CURRENCIES),
  body("ledgerCode")
    .optional()
    .isString()
    .trim()
    .toUpperCase()
    .matches(/^[A-Z0-9]{2,20}$/),
  body("chartOfAccount").optional().isMongoId(),
  body("status").optional().isIn(BANK_CASH_ACCOUNT_STATUS),
  body("note").optional().isString().isLength({ max: 2000 }),
  validate,
]

const idParamValidation = [param("id").isMongoId().withMessage("invalid bank cash account id"), validate]

const listBankCashAccountsValidation = [
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
  query("q").optional().isString().trim(),
  query("accountType").optional().isIn(BANK_CASH_ACCOUNT_TYPES),
  query("status").optional().isIn(BANK_CASH_ACCOUNT_STATUS),
  query("currency").optional().isIn(BANK_CASH_ACCOUNT_CURRENCIES),
  query("sortBy").optional().isIn(["accountName", "accountType", "currency", "status", "createdAt", "updatedAt"]),
  query("sortOrder").optional().isIn(["asc", "desc"]),
  validate,
]

module.exports = {
  createBankCashAccountValidation,
  updateBankCashAccountValidation,
  idParamValidation,
  listBankCashAccountsValidation,
}
