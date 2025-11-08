const { body, param, query, validationResult } = require("express-validator")

const validate = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })
  next()
}

const searchCargoBookingsValidation = [
  query("originPort").optional().isMongoId(),
  query("destinationPort").optional().isMongoId(),
  query("departureDate").optional().isISO8601().toDate(),
  query("cargoType").optional().isIn(["General", "Container", "Hazmat", "Perishable", "Breakable", "Custom"]),
  query("visaType").optional().isIn(["Temporary", "Business", "Transit", "Custom"]),
  query("bookingType").optional().isIn(["OneWay", "Return"]),
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
  validate,
]

const createCargoBookingValidation = [
  body("originPort").isMongoId(),
  body("destinationPort").isMongoId(),
  body("outboundTrip").isMongoId(),
  body("returnTrip").optional().isMongoId(),
  body("departureDate").isISO8601().toDate(),
  body("returnDate").optional().isISO8601().toDate(),
  body("bookingType").isIn(["OneWay", "Return"]),
  body("cargoType").isIn(["General", "Container", "Hazmat", "Perishable", "Breakable", "Custom"]),
  body("visaType").isIn(["Temporary", "Business", "Transit", "Custom"]),
  body("quantity").isInt({ min: 1 }),
  body("quantityUnit").isIn(["Units", "Kilograms", "Tons", "Cubic Meters", "Containers"]),
  body("weight").optional().isFloat({ min: 0 }),
  body("description").isString().trim().notEmpty().isLength({ max: 1000 }),
  body("currency").isMongoId(),
  body("bookingAgent").optional().isMongoId(),
  body("bookingSource").isIn(["Agent", "Internal", "Partner"]),
  validate,
]

const updateCargoBookingValidation = [
  param("id").isMongoId(),
  body("bookingStatus")
    .optional()
    .isIn(["Pending", "Confirmed", "Loaded", "InTransit", "Delivered", "Cancelled", "Completed"]),
  body("quantity").optional().isInt({ min: 1 }),
  body("description").optional().isString().isLength({ max: 1000 }),
  validate,
]

const idParamValidation = [param("id").isMongoId(), validate]

module.exports = {
  searchCargoBookingsValidation,
  createCargoBookingValidation,
  updateCargoBookingValidation,
  idParamValidation,
}
