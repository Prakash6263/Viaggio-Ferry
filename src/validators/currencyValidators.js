const { body, param, query, validationResult } = require("express-validator")

const validate = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() })
  }
  next()
}

const iso4217 = /^[A-Z]{3}$/

const rateItemRules = [
  body("rates").optional().isArray().withMessage("rates must be an array"),
  body("rates.*.at").optional().isISO8601().toDate().withMessage("rates.*.at must be a valid date-time"),
  body("rates.*.rateUSD").optional().isFloat({ min: 0 }).toFloat().withMessage("rates.*.rateUSD must be >= 0"),
]

const createCurrencyValidation = [
  body("code").isString().trim().toUpperCase().matches(iso4217).withMessage("code must be ISO 4217, e.g., USD"),
  body("name").isString().trim().notEmpty().withMessage("name is required"),
  // Optionally allow initial rate via single fields
  body("at")
    .optional()
    .isISO8601()
    .toDate(),
  body("rateUSD").optional().isFloat({ min: 0 }).toFloat(),
  ...rateItemRules,
  validate,
]

const updateCurrencyValidation = [
  param("id").isMongoId().withMessage("invalid currency id"),
  body("code").optional().isString().trim().toUpperCase().matches(iso4217),
  body("name").optional().isString().trim().notEmpty(),
  ...rateItemRules,
  validate,
]

const listCurrenciesValidation = [
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
  query("q").optional().isString().trim(),
  query("sortBy").optional().isIn(["code", "name", "createdAt", "updatedAt"]),
  query("sortOrder").optional().isIn(["asc", "desc"]),
  validate,
]

const idParamValidation = [param("id").isMongoId().withMessage("invalid currency id"), validate]

const addRateValidation = [
  param("id").isMongoId().withMessage("invalid currency id"),
  body("at").isISO8601().toDate().withMessage("at must be a valid date-time"),
  body("rateUSD").isFloat({ min: 0 }).toFloat().withMessage("rateUSD must be >= 0"),
  validate,
]

const removeRateValidation = [
  param("id").isMongoId().withMessage("invalid currency id"),
  param("rateId").isMongoId().withMessage("invalid rate id"),
  validate,
]

const effectiveRateValidation = [
  param("code").isString().trim().toUpperCase().matches(iso4217).withMessage("code must be ISO 4217"),
  query("at").optional().isISO8601().withMessage("at must be ISO date-time"),
  validate,
]

module.exports = {
  createCurrencyValidation,
  updateCurrencyValidation,
  listCurrenciesValidation,
  idParamValidation,
  addRateValidation,
  removeRateValidation,
  effectiveRateValidation,
}
