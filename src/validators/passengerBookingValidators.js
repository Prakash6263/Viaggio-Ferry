const { body, param, query, validationResult } = require("express-validator")

const validate = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })
  next()
}

const searchPassengerBookingsValidation = [
  query("originPort").optional().isMongoId().withMessage("invalid origin port ID"),
  query("destinationPort").optional().isMongoId().withMessage("invalid destination port ID"),
  query("departureDate").optional().isISO8601().toDate(),
  query("returnDate").optional().isISO8601().toDate(),
  query("cabin").optional().isMongoId().withMessage("invalid cabin ID"),
  query("visaType").optional().isIn(["Temporary", "Business", "Transit", "Custom"]).withMessage("invalid visa type"),
  query("bookingType").optional().isIn(["OneWay", "Return"]),
  query("adultsCount").optional().isInt({ min: 0 }).toInt(),
  query("childrenCount").optional().isInt({ min: 0 }).toInt(),
  query("infantsCount").optional().isInt({ min: 0 }).toInt(),
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
  validate,
]

const createPassengerBookingValidation = [
  body("originPort").isMongoId().withMessage("invalid origin port ID"),
  body("destinationPort").isMongoId().withMessage("invalid destination port ID"),
  body("outboundTrip").isMongoId().withMessage("invalid outbound trip ID"),
  body("returnTrip").optional().isMongoId().withMessage("invalid return trip ID"),
  body("departureDate").isISO8601().toDate().withMessage("invalid departure date"),
  body("returnDate").optional().isISO8601().toDate(),
  body("bookingType").isIn(["OneWay", "Return"]),
  body("cabin").isMongoId().withMessage("invalid cabin ID"),
  body("visaType").isIn(["Temporary", "Business", "Transit", "Custom"]).withMessage("invalid visa type"),
  body("currency").isMongoId().withMessage("invalid currency ID"),
  body("bookingAgent").optional().isMongoId().withMessage("invalid booking agent ID"),
  body("b2cCustomer").optional().isMongoId().withMessage("invalid customer ID"),
  body("bookingSource").isIn(["Agent", "B2C", "Internal", "Partner"]),
  body("passengers").isArray({ min: 1 }).withMessage("at least one passenger required"),
  body("passengers.*.passengerName").isString().trim().notEmpty(),
  body("passengers.*.passengerType").isIn(["Adult", "Child", "Infant"]),
  body("passengers.*.email").optional().isEmail(),
  body("specialRequirements").optional().isString().isLength({ max: 2000 }),
  body("remarks").optional().isString().isLength({ max: 2000 }),
  validate,
]

const updatePassengerBookingValidation = [
  param("id").isMongoId().withMessage("invalid booking ID"),
  body("bookingStatus").optional().isIn(["Pending", "Confirmed", "CheckedIn", "Boarded", "Cancelled", "Completed"]),
  body("visaType").optional().isIn(["Temporary", "Business", "Transit", "Custom"]),
  body("passengers").optional().isArray(),
  body("passengers.*.passengerName").optional().isString().trim().notEmpty(),
  body("passengers.*.passengerType").optional().isIn(["Adult", "Child", "Infant"]),
  body("specialRequirements").optional().isString().isLength({ max: 2000 }),
  validate,
]

const idParamValidation = [param("id").isMongoId().withMessage("invalid booking ID"), validate]

module.exports = {
  searchPassengerBookingsValidation,
  createPassengerBookingValidation,
  updatePassengerBookingValidation,
  idParamValidation,
}
