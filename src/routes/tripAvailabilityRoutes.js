const express = require("express")
const { verifyToken, extractCompanyId, extractUserId } = require("../middleware/authMiddleware")
const { checkPermission } = require("../middleware/permissionMiddleware")
const {
  listTripAvailabilities,
  getTripAvailabilityById,
  createTripAvailability,
  updateTripAvailability,
  deleteTripAvailability,
  getTripAvailabilitySummary,
} = require("../controllers/tripAvailabilityController")

const router = express.Router({ mergeParams: true })

// Apply auth middleware
router.use(verifyToken)
router.use(extractCompanyId)
router.use(extractUserId)

// GET /api/trips/:tripId/availabilities - List all availabilities for a trip
router.get("/", checkPermission("ship-trips", "trips", "read"), listTripAvailabilities)

// GET /api/trips/:tripId/availabilities/:availabilityId - Get specific availability
router.get("/:availabilityId", checkPermission("ship-trips", "trips", "read"), getTripAvailabilityById)

// GET /api/trips/:tripId/availabilities/summary - Get availability summary for a trip
router.get("/summary", checkPermission("ship-trips", "trips", "read"), getTripAvailabilitySummary)

// POST /api/trips/:tripId/availabilities - Create new availability
router.post("/", checkPermission("ship-trips", "trips", "write"), createTripAvailability)

// PUT /api/trips/:tripId/availabilities/:availabilityId - Update availability
router.put("/:availabilityId", checkPermission("ship-trips", "trips", "edit"), updateTripAvailability)

// DELETE /api/trips/:tripId/availabilities/:availabilityId - Delete availability
router.delete("/:availabilityId", checkPermission("ship-trips", "trips", "delete"), deleteTripAvailability)

module.exports = router
