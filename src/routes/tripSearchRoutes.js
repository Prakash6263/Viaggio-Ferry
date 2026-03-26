const express = require("express")
const router = express.Router()
const tripSearchController = require("../controllers/tripSearchController")
const { verifyToken, extractCompanyId, extractUserId } = require("../middleware/authMiddleware")
const { checkPermission } = require("../middleware/permissionMiddleware")

// ==================== AUTHENTICATION MIDDLEWARE ====================
// All routes require authentication and company extraction
router.use(verifyToken)
router.use(extractCompanyId)
router.use(extractUserId)

// ==================== TRIP SEARCH ROUTES ====================

/**
 * POST /api/trip-search
 * Search for trips with pricing based on filter criteria from request body
 * 
 * Request Body:
 * {
 *   category: "passenger" | "vehicle" | "cargo" (required)
 *   tripType: "one_way" | "return" | "round_trip" (required)
 *   originPort: ObjectId (required)
 *   destinationPort: ObjectId (required)
 *   departureDate: Date string "YYYY-MM-DD" (required)
 *   cabin: ObjectId (optional - filter by specific cabin)
 *   visaType: String (optional - filter by visa type)
 *   passengers: Array (required) - Array of passenger objects
 *     [{ payloadTypeId: ObjectId, quantity: Number }]
 * }
 * 
 * Availability Logic:
 * - Company users: availableSeats = TripAvailability.totalCapacity - SUM(agent allocations)
 * - Agent users: availableSeats = MIN(companyRemaining, parentRemaining, agentRemaining)
 * 
 * Price Priority:
 * 1. Partner-specific price (if agent)
 * 2. Route default price
 * 
 * Requires: read permission on trips
 */
router.post("/", checkPermission("ship-trips", "trips", "read"), tripSearchController.searchTrips)

/**
 * GET /api/trip-search
 * Search for trips with pricing using query parameters
 * 
 * Query Parameters:
 * - category: "passenger" | "vehicle" | "cargo" (required)
 * - tripType: "one_way" | "return" | "round_trip" (required)
 * - originPort: ObjectId (required)
 * - destinationPort: ObjectId (required)
 * - departureDate: Date string "YYYY-MM-DD" (required)
 * - cabin: ObjectId (optional)
 * - visaType: String (optional)
 * - passengers: JSON string of array [{ payloadTypeId: ObjectId, quantity: Number }]
 * 
 * Note: POST method is recommended for complex passenger arrays
 * 
 * Requires: read permission on trips
 */
router.get("/", checkPermission("ship-trips", "trips", "read"), tripSearchController.searchTripsGet)

module.exports = router
