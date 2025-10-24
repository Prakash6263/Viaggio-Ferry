const { body, param, query, validationResult } = require("express-validator")
const { APPLIED_TO_LAYERS, COMMISSION_FLOW, RULE_STATUS } = require("../models/CommissionRule")

const validate = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })
  next()
}

const baseFields = [
  body("ruleName").isString().trim().isLength({ min: 2, max: 100 }),
  body("commissionValue").isFloat({ min: 0, max: 100 }),
  body("provider").isMongoId().withMessage("provider must be a valid Partner ID"),
  body("appliedToLayer").isIn(APPLIED_TO_LAYERS),
  body("partner").optional().isMongoId().withMessage("partner must be a valid Partner ID"),
  body("effectiveDate").isISO8601().toDate(),
  body("expiryDate").optional().isISO8601().toDate(),
  body("status").optional().isIn(RULE_STATUS),
]

const serviceTypesValidation = [
  body("serviceTypes").optional().isArray(),
  body("serviceTypes.*").isIn(["Passenger", "Cargo", "Vehicle"]),
]

const routesValidation = [
  body("routes").optional().isArray(),
  body("routes.*.from").optional().isString().trim().isLength({ min: 1 }),
  body("routes.*.to").optional().isString().trim().isLength({ min: 1 }),
]

const visaValidation = [body("visaType").optional().isString().trim()]

const commissionFlowValidation = [
  body("commissionFlow").optional().isArray(),
  body("commissionFlow.*").isIn(COMMISSION_FLOW),
]

const createRuleValidation = [
  ...baseFields,
  ...serviceTypesValidation,
  ...routesValidation,
  ...visaValidation,
  ...commissionFlowValidation,
  validate,
]

const updateRuleValidation = [
  param("id").isMongoId().withMessage("invalid id"),
  body("ruleName").optional().isString().trim().isLength({ min: 2, max: 100 }),
  body("commissionValue").optional().isFloat({ min: 0, max: 100 }),
  body("provider").optional().isMongoId().withMessage("provider must be a valid Partner ID"),
  body("appliedToLayer").optional().isIn(APPLIED_TO_LAYERS),
  body("partner").optional().isMongoId().withMessage("partner must be a valid Partner ID"),
  body("effectiveDate").optional().isISO8601().toDate(),
  body("expiryDate").optional().isISO8601().toDate(),
  body("status").optional().isIn(RULE_STATUS),
  ...serviceTypesValidation,
  ...routesValidation,
  ...visaValidation,
  ...commissionFlowValidation,
  validate,
]

const idParamValidation = [param("id").isMongoId().withMessage("invalid id"), validate]

const listRulesValidation = [
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
  query("q").optional().isString().trim(),
  query("provider").optional().isMongoId(),
  query("appliedToLayer").optional().isIn(APPLIED_TO_LAYERS),
  query("status").optional().isIn(RULE_STATUS),
  query("sortBy").optional().isIn(["ruleName", "status", "createdAt", "updatedAt", "effectiveDate"]),
  query("sortOrder").optional().isIn(["asc", "desc"]),
  validate,
]

const calculateCommissionValidation = [
  body("serviceType").isIn(["Passenger", "Cargo", "Vehicle"]),
  body("layer").isIn(APPLIED_TO_LAYERS),
  body("partner").optional().isMongoId(),
  body("item").isObject(),
  body("item.visaType").optional().isString().trim(),
  body("item.route").optional().isObject(),
  body("item.route.from").optional().isString().trim(),
  body("item.route.to").optional().isString().trim(),
  body("basePrice").isFloat({ min: 0 }),
  validate,
]

module.exports = {
  createRuleValidation,
  updateRuleValidation,
  idParamValidation,
  listRulesValidation,
  calculateCommissionValidation,
}
