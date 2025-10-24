const { body, param, query, validationResult } = require("express-validator")
const {
  RULE_TYPES,
  VALUE_TYPES,
  APPLIED_TO_LAYERS,
  PASSENGER_TYPES,
  CABIN_CLASSES,
  CARGO_TYPES,
  VEHICLE_TYPES,
  RULE_STATUS,
} = require("../models/MarkupDiscountRule")

const validate = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })
  next()
}

const baseFields = [
  body("ruleName").isString().trim().isLength({ min: 2, max: 100 }),
  body("ruleType").isIn(RULE_TYPES),
  body("valueType").optional().isIn(VALUE_TYPES),
  body("value").isFloat({ min: 0 }),
  body("provider").isMongoId().withMessage("provider must be a valid Partner ID"),
  body("appliedToLayer").isIn(APPLIED_TO_LAYERS),
  body("partner").optional().isMongoId().withMessage("partner must be a valid Partner ID"),
  body("commissionValue").optional().isFloat({ min: 0 }).toFloat(),
  body("effectiveDate").isISO8601().toDate(),
  body("expiryDate").optional().isISO8601().toDate(),
  body("status").optional().isIn(RULE_STATUS),
]

const serviceTypesValidation = [
  body("serviceTypes").optional().isArray(),
  body("serviceTypes.*").isIn(["Passenger", "Cargo", "Vehicle"]),
]

const conditionsValidation = [
  body("passengerCabins").optional().isArray(),
  body("passengerCabins.*").isIn(CABIN_CLASSES),
  body("passengerTypes").optional().isArray(),
  body("passengerTypes.*").isIn(PASSENGER_TYPES),
  body("cargoTypes").optional().isArray(),
  body("cargoTypes.*").isIn(CARGO_TYPES),
  body("vehicleTypes").optional().isArray(),
  body("vehicleTypes.*").isIn(VEHICLE_TYPES),
]

const routesValidation = [
  body("routes").optional().isArray(),
  body("routes.*.from").optional().isString().trim().isLength({ min: 1 }),
  body("routes.*.to").optional().isString().trim().isLength({ min: 1 }),
]

const visaValidation = [body("visaType").optional().isString().trim()]

const createRuleValidation = [
  ...baseFields,
  ...serviceTypesValidation,
  ...conditionsValidation,
  ...routesValidation,
  ...visaValidation,
  validate,
]

const updateRuleValidation = [
  param("id").isMongoId().withMessage("invalid id"),
  body("ruleName").optional().isString().trim().isLength({ min: 2, max: 100 }),
  body("ruleType").optional().isIn(RULE_TYPES),
  body("valueType").optional().isIn(VALUE_TYPES),
  body("value").optional().isFloat({ min: 0 }),
  body("provider").optional().isMongoId().withMessage("provider must be a valid Partner ID"),
  body("appliedToLayer").optional().isIn(APPLIED_TO_LAYERS),
  body("partner").optional().isMongoId().withMessage("partner must be a valid Partner ID"),
  body("commissionValue").optional().isFloat({ min: 0 }).toFloat(),
  body("effectiveDate").optional().isISO8601().toDate(),
  body("expiryDate").optional().isISO8601().toDate(),
  body("status").optional().isIn(RULE_STATUS),
  ...serviceTypesValidation,
  ...conditionsValidation,
  ...routesValidation,
  ...visaValidation,
  validate,
]

const idParamValidation = [param("id").isMongoId().withMessage("invalid id"), validate]

const listRulesValidation = [
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
  query("q").optional().isString().trim(),
  query("provider").optional().isMongoId(),
  query("appliedToLayer").optional().isIn(APPLIED_TO_LAYERS),
  query("ruleType").optional().isIn(RULE_TYPES),
  query("status").optional().isIn(RULE_STATUS),
  query("sortBy").optional().isIn(["ruleName", "ruleType", "status", "createdAt", "updatedAt", "effectiveDate"]),
  query("sortOrder").optional().isIn(["asc", "desc"]),
  validate,
]

const applyRulesValidation = [
  body("serviceType").isIn(["Passenger", "Cargo", "Vehicle"]),
  body("layer").isIn(APPLIED_TO_LAYERS),
  body("partner").optional().isMongoId(),
  body("item").isObject(),
  body("item.passengerType").optional().isIn(PASSENGER_TYPES),
  body("item.cabinClass").optional().isIn(CABIN_CLASSES),
  body("item.cargoType").optional().isIn(CARGO_TYPES),
  body("item.vehicleType").optional().isIn(VEHICLE_TYPES),
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
  applyRulesValidation,
}
