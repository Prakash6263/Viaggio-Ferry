const express = require("express")
const { checkPermission } = require("../middleware/permissionMiddleware")
const {
  validateTripPayload,
  validateAllocationPayload,
  validatePaginationParams,
  validateDateRangeParams,
} = require("../middleware/tripValidationMiddleware")
const {
  createTrip,
  listTrips,
  getTripById,
  updateTrip,
  deleteTrip,
  getTripAvailability,
  createAvailability,
  updateAvailability,
  deleteAvailability,
} = require("../controllers/tripController")

const {
  createAllocation,
  listAllocations,
  updateAllocation,
  deleteAllocation,
} = require("../controllers/allocationController")

const {
  assignRuleToTrip,
  updateTripRule,
  removeTripRule,
  getTripRules,
} = require("../controllers/tripTicketRuleController")

const tripTicketRuleValidationMiddleware = require("../middleware/tripTicketRuleValidationMiddleware")

const router = express.Router()

// Trip Routes
router.post(
  "/",
  checkPermission("sales-bookings", "trip", "write"),
  validateTripPayload,
  createTrip
)

router.get(
  "/",
  checkPermission("sales-bookings", "trip", "read"),
  validatePaginationParams,
  validateDateRangeParams,
  listTrips
)

router.get("/:id", checkPermission("sales-bookings", "trip", "read"), getTripById)

router.put(
  "/:id",
  checkPermission("sales-bookings", "trip", "edit"),
  validateTripPayload,
  updateTrip
)

router.delete("/:id", checkPermission("sales-bookings", "trip", "delete"), deleteTrip)

// Trip Availability Routes
router.get(
  "/:tripId/availability",
  checkPermission("sales-bookings", "trip", "read"),
  getTripAvailability
)

router.post(
  "/:tripId/availability",
  checkPermission("sales-bookings", "trip", "write"),
  createAvailability
)

router.put(
  "/:tripId/availability/:availabilityId",
  checkPermission("sales-bookings", "trip", "edit"),
  updateAvailability
)

router.delete(
  "/:tripId/availability/:availabilityId",
  checkPermission("sales-bookings", "trip", "delete"),
  deleteAvailability
)

// Agent Allocation Routes
router.post(
  "/:tripId/allocations",
  checkPermission("sales-bookings", "trip", "write"),
  validateAllocationPayload,
  createAllocation
)

router.get(
  "/:tripId/allocations",
  checkPermission("sales-bookings", "trip", "read"),
  listAllocations
)

router.put(
  "/:tripId/allocations/:allocationId",
  checkPermission("sales-bookings", "trip", "edit"),
  validateAllocationPayload,
  updateAllocation
)

router.delete(
  "/:tripId/allocations/:allocationId",
  checkPermission("sales-bookings", "trip", "delete"),
  deleteAllocation
)

// Trip Ticket Rule Routes
router.post(
  "/:tripId/ticketing-rules",
  checkPermission("sales-bookings", "trip", "write"),
  tripTicketRuleValidationMiddleware.validatePathParams,
  tripTicketRuleValidationMiddleware.validateCreatePayload,
  assignRuleToTrip
)

router.get(
  "/:tripId/ticketing-rules",
  checkPermission("sales-bookings", "trip", "read"),
  tripTicketRuleValidationMiddleware.validatePathParams,
  getTripRules
)

router.put(
  "/:tripId/ticketing-rules/:id",
  checkPermission("sales-bookings", "trip", "edit"),
  tripTicketRuleValidationMiddleware.validatePathParams,
  tripTicketRuleValidationMiddleware.validateUpdatePayload,
  updateTripRule
)

router.delete(
  "/:tripId/ticketing-rules/:id",
  checkPermission("sales-bookings", "trip", "delete"),
  tripTicketRuleValidationMiddleware.validatePathParams,
  removeTripRule
)

module.exports = router
