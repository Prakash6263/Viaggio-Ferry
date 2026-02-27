const express = require("express")
const router = express.Router()
const tripController = require("../controllers/tripController")
const tripAvailabilityRoutes = require("./tripAvailabilityRoutes")
const { verifyToken, extractCompanyId, extractUserId } = require("../middleware/authMiddleware")
const { checkPermission } = require("../middleware/permissionMiddleware")

// ==================== AUTHENTICATION MIDDLEWARE ====================
// All routes require authentication and company extraction
router.use(verifyToken)
router.use(extractCompanyId)
router.use(extractUserId)

// ==================== TRIP MANAGEMENT ROUTES ====================

/**
 * GET /api/trips
 * List all trips for the company - requires read permission on trips
 */
router.get("/", checkPermission("ship-trips", "trips", "read"), tripController.listTrips)

/**
 * GET /api/trips/:id
 * Get specific trip by ID - requires read permission on trips
 */
router.get("/:id", checkPermission("ship-trips", "trips", "read"), tripController.getTripById)

/**
 * GET /api/trips/:id/availability
 * Get trip availability (remaining seats/spots) - requires read permission on trips
 */
router.get("/:id/availability", checkPermission("ship-trips", "trips", "read"), tripController.getTripAvailability)

/**
 * POST /api/trips
 * Create a new trip - requires create/write permission on trips
 */
router.post("/", checkPermission("ship-trips", "trips", "write"), tripController.createTrip)

/**
 * PUT /api/trips/:id
 * Update an existing trip - requires update/edit permission on trips
 */
router.put("/:id", checkPermission("ship-trips", "trips", "edit"), tripController.updateTrip)

/**
 * DELETE /api/trips/:id
 * Delete a trip (soft delete) - requires delete permission on trips
 */
router.delete("/:id", checkPermission("ship-trips", "trips", "delete"), tripController.deleteTrip)

// ==================== TRIP AVAILABILITY ROUTES ====================
// Mount availability routes at /api/trips/:tripId/availabilities
router.use("/:tripId/availabilities", tripAvailabilityRoutes)

module.exports = router
