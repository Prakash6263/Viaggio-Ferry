const { body } = require("express-validator")

const commonFields = [
  body("tripName").optional().isString().trim().notEmpty().withMessage("tripName required"),
  body("tripCode").optional().isString().trim().notEmpty().withMessage("tripCode required"),
  body("vessel").optional().isMongoId().withMessage("Invalid vessel ID"),
  body("departurePort").optional().isMongoId().withMessage("Invalid departure port ID"),
  body("arrivalPort").optional().isMongoId().withMessage("Invalid arrival port ID"),
  body("departureDateTime").optional().isISO8601().toDate(),
  body("arrivalDateTime").optional().isISO8601().toDate(),
  body("status").optional().isIn(["Scheduled", "In Progress", "Completed", "Cancelled"]),
  body("bookingOpeningDate").optional().isISO8601().toDate(),
  body("bookingClosingDate").optional().isISO8601().toDate(),
  body("checkInOpeningDate").optional().isISO8601().toDate(),
  body("checkInClosingDate").optional().isISO8601().toDate(),
  body("boardingClosingDate").optional().isISO8601().toDate(),
  body("promotion").optional().isMongoId().withMessage("Invalid promotion ID"),
  body("remarks").optional().isString(),
]

const createTripRules = [
  body("tripName").exists().withMessage("tripName is required"),
  body("tripCode").exists().withMessage("tripCode is required"),
  body("vessel").exists().isMongoId().withMessage("vessel ID is required"),
  body("departurePort").exists().isMongoId().withMessage("departurePort ID is required"),
  body("arrivalPort").exists().isMongoId().withMessage("arrivalPort ID is required"),
  body("departureDateTime").exists().isISO8601().toDate().withMessage("departureDateTime is required"),
  body("arrivalDateTime").exists().isISO8601().toDate().withMessage("arrivalDateTime is required"),
  ...commonFields,
]

const updateTripRules = [...commonFields]

const addAvailabilityRules = [
  body("type").exists().isIn(["Passenger", "Cargo", "Vehicle"]).withMessage("type is required"),
  body("category").exists().isString().trim().notEmpty().withMessage("category is required"),
  body("totalQuantity").exists().isInt({ min: 0 }).withMessage("totalQuantity is required and must be >= 0"),
]

const allocateToAgentRules = [
  body("availabilityId").exists().isMongoId().withMessage("availabilityId is required"),
  body("agentId").exists().isMongoId().withMessage("agentId is required"),
  body("allocatedQuantity").exists().isInt({ min: 0 }).withMessage("allocatedQuantity is required and must be >= 0"),
]

const removeAllocationRules = [
  body("availabilityId").exists().isMongoId().withMessage("availabilityId is required"),
  body("allocationId").exists().isMongoId().withMessage("allocationId is required"),
]

const removeAvailabilityRules = [body("availabilityId").exists().isMongoId().withMessage("availabilityId is required")]

const addTicketingRuleRules = [
  body("ruleType").exists().isString().trim().notEmpty().withMessage("ruleType is required"),
  body("ruleValue").exists().isString().trim().notEmpty().withMessage("ruleValue is required"),
]

const removeTicketingRuleRules = [body("ruleId").exists().isMongoId().withMessage("ruleId is required")]

module.exports = {
  createTripRules,
  updateTripRules,
  addAvailabilityRules,
  allocateToAgentRules,
  removeAllocationRules,
  removeAvailabilityRules,
  addTicketingRuleRules,
  removeTicketingRuleRules,
}
