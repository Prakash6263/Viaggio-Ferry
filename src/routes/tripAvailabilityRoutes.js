const express = require("express")
const { checkPermission } = require("../middleware/permissionMiddleware")
const {
  listTripAvailabilities,
  getTripAvailabilityById,
  createTripAvailability,
  updateTripAvailability,
  deleteTripAvailability,
  getTripAvailabilitySummary,
} = require("../controllers/tripAvailabilityController")
const agentAllocationRoutes = require("./agentAllocationRoutes")

const router = express.Router({ mergeParams: true })

// GET /api/trips/:tripId/availabilities/summary - Get availability summary for a trip
// This must come before /:availabilityId route to avoid collision
router.get("/summary", checkPermission("ship-trips", "trips", "read"), getTripAvailabilitySummary)

// Mount agent allocation routes at /:availabilityId/
router.use("/:availabilityId", agentAllocationRoutes)

// GET /api/trips/:tripId/availabilities - List all availabilities for a trip
router.get("/", checkPermission("ship-trips", "trips", "read"), listTripAvailabilities)

// GET /api/trips/:tripId/availabilities/:availabilityId - Get specific availability
router.get("/:availabilityId", checkPermission("ship-trips", "trips", "read"), getTripAvailabilityById)

// POST /api/trips/:tripId/availabilities - Create new availability
router.post("/", checkPermission("ship-trips", "trips", "write"), createTripAvailability)

// PUT /api/trips/:tripId/availabilities/:availabilityId - Update availability
router.put("/:availabilityId", checkPermission("ship-trips", "trips", "edit"), updateTripAvailability)

// DELETE /api/trips/:tripId/availabilities/:availabilityId - Delete availability
router.delete("/:availabilityId", checkPermission("ship-trips", "trips", "delete"), deleteTripAvailability)

module.exports = router
