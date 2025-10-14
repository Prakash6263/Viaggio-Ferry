const { body, param, query, validationResult } = require("express-validator")
const {
  PROMOTION_STATUS,
  PROMOTION_BASIS,
  RULE_TYPE,
  DISCOUNT_TYPE,
  PASSENGER_TYPES,
  CABIN_CLASSES,
  CARGO_TYPES,
  VEHICLE_TYPES,
} = require("../models/Promotion")

const validate = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })
  next()
}

const baseFields = [
  body("name").isString().trim().isLength({ min: 2, max: 100 }),
  body("description").optional().isString().trim().isLength({ max: 1000 }),
  body("status").optional().isIn(PROMOTION_STATUS),
  body("basis").isIn(PROMOTION_BASIS),
]

const basisPeriod = [
  body("period").if(body("basis").equals("PERIOD")).exists().withMessage("period is required for PERIOD basis"),
  body("period.startAt").if(body("basis").equals("PERIOD")).isISO8601().toDate(),
  body("period.endAt").if(body("basis").equals("PERIOD")).isISO8601().toDate(),
  body("period")
    .if(body("basis").equals("PERIOD"))
    .custom((v) => {
      if (new Date(v.startAt) >= new Date(v.endAt)) throw new Error("period.startAt must be before period.endAt")
      return true
    }),
]

const basisTrip = [
  body("tripId")
    .if(body("basis").equals("TRIP"))
    .isMongoId()
    .withMessage("tripId is required and must be a valid id for TRIP basis"),
]

const passengerTicketsCommon = [
  body("passengerTickets.enabled").isBoolean(),
  body("passengerTickets.ruleType").if(body("passengerTickets.enabled").equals(true)).isIn(RULE_TYPE),
]

// Quantity rule validators
const passengerQuantityRule = [
  body("passengerTickets.quantityRule").if(body("passengerTickets.ruleType").equals("QUANTITY")).exists(),
  body("passengerTickets.quantityRule.buyX").if(body("passengerTickets.ruleType").equals("QUANTITY")).isInt({ min: 1 }),
  body("passengerTickets.quantityRule.getY").if(body("passengerTickets.ruleType").equals("QUANTITY")).isInt({ min: 1 }),
]

// Total value rule validators
const passengerTotalValueRule = [
  body("passengerTickets.totalValueRule").if(body("passengerTickets.ruleType").equals("TOTAL_VALUE")).exists(),
  body("passengerTickets.totalValueRule.minAmount")
    .if(body("passengerTickets.ruleType").equals("TOTAL_VALUE"))
    .isFloat({ gt: 0 })
    .toFloat(),
  body("passengerTickets.totalValueRule.discount.type")
    .if(body("passengerTickets.ruleType").equals("TOTAL_VALUE"))
    .isIn(DISCOUNT_TYPE),
  body("passengerTickets.totalValueRule.discount.value")
    .if(body("passengerTickets.ruleType").equals("TOTAL_VALUE"))
    .isFloat({ gt: 0 })
    .toFloat(),
]

const cargoTicketsCommon = [
  body("cargoTickets.enabled").isBoolean(),
  body("cargoTickets.ruleType").if(body("cargoTickets.enabled").equals(true)).isIn(RULE_TYPE),
]

const cargoQuantityRule = [
  body("cargoTickets.quantityRule").if(body("cargoTickets.ruleType").equals("QUANTITY")).exists(),
  body("cargoTickets.quantityRule.buyX").if(body("cargoTickets.ruleType").equals("QUANTITY")).isInt({ min: 1 }),
  body("cargoTickets.quantityRule.getY").if(body("cargoTickets.ruleType").equals("QUANTITY")).isInt({ min: 1 }),
]

const cargoTotalValueRule = [
  body("cargoTickets.totalValueRule").if(body("cargoTickets.ruleType").equals("TOTAL_VALUE")).exists(),
  body("cargoTickets.totalValueRule.minAmount")
    .if(body("cargoTickets.ruleType").equals("TOTAL_VALUE"))
    .isFloat({ gt: 0 })
    .toFloat(),
  body("cargoTickets.totalValueRule.discount.type")
    .if(body("cargoTickets.ruleType").equals("TOTAL_VALUE"))
    .isIn(DISCOUNT_TYPE),
  body("cargoTickets.totalValueRule.discount.value")
    .if(body("cargoTickets.ruleType").equals("TOTAL_VALUE"))
    .isFloat({ gt: 0 })
    .toFloat(),
]

const vehicleTicketsCommon = [
  body("vehicleTickets.enabled").isBoolean(),
  body("vehicleTickets.ruleType").if(body("vehicleTickets.enabled").equals(true)).isIn(RULE_TYPE),
]

const vehicleQuantityRule = [
  body("vehicleTickets.quantityRule").if(body("vehicleTickets.ruleType").equals("QUANTITY")).exists(),
  body("vehicleTickets.quantityRule.buyX").if(body("vehicleTickets.ruleType").equals("QUANTITY")).isInt({ min: 1 }),
  body("vehicleTickets.quantityRule.getY").if(body("vehicleTickets.ruleType").equals("QUANTITY")).isInt({ min: 1 }),
]

const vehicleTotalValueRule = [
  body("vehicleTickets.totalValueRule").if(body("vehicleTickets.ruleType").equals("TOTAL_VALUE")).exists(),
  body("vehicleTickets.totalValueRule.minAmount")
    .if(body("vehicleTickets.ruleType").equals("TOTAL_VALUE"))
    .isFloat({ gt: 0 })
    .toFloat(),
  body("vehicleTickets.totalValueRule.discount.type")
    .if(body("vehicleTickets.ruleType").equals("TOTAL_VALUE"))
    .isIn(DISCOUNT_TYPE),
  body("vehicleTickets.totalValueRule.discount.value")
    .if(body("vehicleTickets.ruleType").equals("TOTAL_VALUE"))
    .isFloat({ gt: 0 })
    .toFloat(),
]

const eligibilityValidators = [
  body("eligibilityConditions").optional().isArray(),
  body("eligibilityConditions.*.passengerType").optional().isIn(PASSENGER_TYPES),
  body("eligibilityConditions.*.cabinClass").optional().isIn(CABIN_CLASSES),
]

const cargoEligibilityValidators = [
  body("cargoEligibilityConditions").optional().isArray(),
  body("cargoEligibilityConditions.*.cargoType").optional().isIn(CARGO_TYPES),
]

const vehicleEligibilityValidators = [
  body("vehicleEligibilityConditions").optional().isArray(),
  body("vehicleEligibilityConditions.*.vehicleType").optional().isIn(VEHICLE_TYPES),
]

const createPromotionValidation = [
  ...baseFields,
  ...basisPeriod,
  ...basisTrip,
  ...passengerTicketsCommon,
  ...passengerQuantityRule,
  ...passengerTotalValueRule,
  ...cargoTicketsCommon,
  ...cargoQuantityRule,
  ...cargoTotalValueRule,
  ...vehicleTicketsCommon,
  ...vehicleQuantityRule,
  ...vehicleTotalValueRule,
  ...eligibilityValidators,
  ...cargoEligibilityValidators,
  ...vehicleEligibilityValidators,
  validate,
]

const updatePromotionValidation = [
  param("id").isMongoId().withMessage("invalid id"),
  body("name").optional().isString().trim().isLength({ min: 2, max: 100 }),
  body("description").optional().isString().trim().isLength({ max: 1000 }),
  body("status").optional().isIn(PROMOTION_STATUS),
  body("basis").optional().isIn(PROMOTION_BASIS),
  ...basisPeriod.map((r) => (r.optional ? r.optional() : r)),
  ...basisTrip.map((r) => (r.optional ? r.optional() : r)),
  body("passengerTickets.enabled").optional().isBoolean(),
  body("passengerTickets.ruleType").optional().isIn(RULE_TYPE),
  ...passengerQuantityRule.map((r) => (r.optional ? r.optional() : r)),
  ...passengerTotalValueRule.map((r) => (r.optional ? r.optional() : r)),
  body("cargoTickets.enabled").optional().isBoolean(),
  body("cargoTickets.ruleType").optional().isIn(RULE_TYPE),
  ...cargoQuantityRule.map((r) => (r.optional ? r.optional() : r)),
  ...cargoTotalValueRule.map((r) => (r.optional ? r.optional() : r)),
  body("vehicleTickets.enabled").optional().isBoolean(),
  body("vehicleTickets.ruleType").optional().isIn(RULE_TYPE),
  ...vehicleQuantityRule.map((r) => (r.optional ? r.optional() : r)),
  ...vehicleTotalValueRule.map((r) => (r.optional ? r.optional() : r)),
  ...eligibilityValidators,
  ...cargoEligibilityValidators,
  ...vehicleEligibilityValidators,
  validate,
]

const idParamValidation = [param("id").isMongoId().withMessage("invalid id"), validate]

const listPromotionsValidation = [
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
  query("q").optional().isString().trim(),
  query("status").optional().isIn(PROMOTION_STATUS),
  query("basis").optional().isIn(PROMOTION_BASIS),
  query("tripId").optional().isMongoId(),
  query("activeOn").optional().isISO8601().toDate(),
  query("sortBy")
    .optional()
    .isIn(["name", "status", "basis", "createdAt", "updatedAt", "period.startAt", "period.endAt"]),
  query("sortOrder").optional().isIn(["asc", "desc"]),
  validate,
]

const applyPromotionValidation = [
  body("basisContext").optional().isObject(),
  body("basisContext.at").optional().isISO8601().toDate(),
  body("basisContext.tripId").optional().isMongoId(),
  body("cart.items").isArray({ min: 1 }),
  body("cart.items.*.type").isString().isIn(["PASSENGER", "CARGO", "VEHICLE"]),
  body("cart.items.*.quantity").isInt({ min: 1 }),
  body("cart.items.*.unitPrice").optional().isFloat({ min: 0 }),
  body("cart.items.*.lineTotal").optional().isFloat({ min: 0 }),
  body("cart.items.*.passengerType").if(body("cart.items.*.type").equals("PASSENGER")).isIn(PASSENGER_TYPES),
  body("cart.items.*.cabinClass").if(body("cart.items.*.type").equals("PASSENGER")).isIn(CABIN_CLASSES),
  body("cart.items.*.cargoType").if(body("cart.items.*.type").equals("CARGO")).isIn(CARGO_TYPES),
  body("cart.items.*.vehicleType").if(body("cart.items.*.type").equals("VEHICLE")).isIn(VEHICLE_TYPES),
  validate,
]

module.exports = {
  createPromotionValidation,
  updatePromotionValidation,
  idParamValidation,
  listPromotionsValidation,
  applyPromotionValidation,
}
