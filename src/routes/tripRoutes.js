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
} = require("../controllers/tripController")

const {
  createAllocation,
  listAllocations,
  updateAllocation,
  deleteAllocation,
} = require("../controllers/allocationController")

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

module.exports = router
