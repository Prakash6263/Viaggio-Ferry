const { body, param, query, validationResult } = require("express-validator")
const { TAX_STATUS, TAX_TYPE, TAX_FORM } = require("../models/Tax")

const validate = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })
  next()
}

const createTaxValidation = [
  body("code")
    .isString()
    .trim()
    .notEmpty()
    .isLength({ min: 1, max: 10 })
    .customSanitizer((v) => v.toUpperCase()),
  body("name").isString().trim().notEmpty().isLength({ max: 100 }),
  body("ledgerCode").optional().isString().trim().isLength({ max: 20 }),
  body("value").isFloat({ min: 0 }).toFloat(),
  body("type")
    .isString()
    .trim()
    .customSanitizer((v) => (v === "%" || v === "Fixed" ? v : v === "PERCENT" ? "%" : "Fixed"))
    .isIn(TAX_TYPE),
  body("form")
    .isString()
    .trim()
    .customSanitizer((v) => (v.toLowerCase().includes("non") ? "Non Refundable" : "Refundable"))
    .isIn(TAX_FORM),
  body("status").optional().isIn(TAX_STATUS),
  validate,
]

const updateTaxValidation = [
  param("id").isMongoId().withMessage("invalid id"),
  body("code")
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 10 })
    .customSanitizer((v) => v.toUpperCase()),
  body("name").optional().isString().trim().isLength({ max: 100 }),
  body("ledgerCode").optional().isString().trim().isLength({ max: 20 }),
  body("value").optional().isFloat({ min: 0 }).toFloat(),
  body("type")
    .optional()
    .isString()
    .trim()
    .customSanitizer((v) => (v === "%" || v === "Fixed" ? v : v === "PERCENT" ? "%" : "Fixed"))
    .isIn(TAX_TYPE),
  body("form")
    .optional()
    .isString()
    .trim()
    .customSanitizer((v) => (v.toLowerCase().includes("non") ? "Non Refundable" : "Refundable"))
    .isIn(TAX_FORM),
  body("status").optional().isIn(TAX_STATUS),
  validate,
]

const idParamValidation = [param("id").isMongoId().withMessage("invalid id"), validate]

const listTaxesValidation = [
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
  query("q").optional().isString().trim(),
  query("status").optional().isIn(TAX_STATUS),
  query("type").optional().isIn(TAX_TYPE),
  query("form").optional().isIn(TAX_FORM),
  query("sortBy")
    .optional()
    .isIn(["code", "name", "ledgerCode", "value", "type", "form", "status", "createdAt", "updatedAt"]),
  query("sortOrder").optional().isIn(["asc", "desc"]),
  validate,
]

module.exports = {
  createTaxValidation,
  updateTaxValidation,
  idParamValidation,
  listTaxesValidation,
}
