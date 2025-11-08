const { body, param, query, validationResult } = require("express-validator")

const validate = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })
  next()
}

const searchVehicleBookingsValidation = [
  query("originPort").optional().isMongoId(),
  query("destinationPort").optional().isMongoId(),
  query("departureDate").optional().isISO8601().toDate(),
  query("vehicleType").optional().isIn(["Sedan", "SUV", "Truck", "Bus", "Motorcycle", "Van", "Other"]),
  query("visaType").optional().isIn(["Temporary", "Business", "Transit", "Custom"]),
  query("bookingType").optional().isIn(["OneWay", "Return"]),
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
  validate,
]

const createVehicleBookingValidation = [
  body("originPort").isMongoId(),
  body("destinationPort").isMongoId(),
  body("outboundTrip").isMongoId(),
  body("returnTrip").optional().isMongoId(),
  body("departureDate").isISO8601().toDate(),
  body("returnDate").optional().isISO8601().toDate(),
  body("bookingType").isIn(["OneWay", "Return"]),
  body("vehicleType").isIn(["Sedan", "SUV", "Truck", "Bus", "Motorcycle", "Van", "Other"]),
  body("visaType").isIn(["Temporary", "Business", "Transit", "Custom"]),
  body("vehicleRegistration").isString().trim().notEmpty(),
  body("ownerName").isString().trim().notEmpty(),
  body("currency").isMongoId(),
  body("bookingAgent").optional().isMongoId(),
  body("bookingSource").isIn(["Agent", "Internal", "Partner"]),
  validate,
]

const updateVehicleBookingValidation = [
  param("id").isMongoId(),
  body("bookingStatus").optional().isIn(["Pending", "Confirmed", "CheckedIn", "Loaded", "Cancelled", "Completed"]),
  body("vehicleRegistration").optional().isString().trim().notEmpty(),
  validate,
]

const idParamValidation = [param("id").isMongoId(), validate]

module.exports = {
  searchVehicleBookingsValidation,
  createVehicleBookingValidation,
  updateVehicleBookingValidation,
  idParamValidation,
}
