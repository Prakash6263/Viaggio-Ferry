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
 *   adults: Number (optional - default: 1)
 *   children: Number (optional - default: 0)
 * }
 * 
 * Requires: read permission on trips
 */
router.post("/",
     checkPermission("partners-management", "allocation", "read"),
      tripSearchController.searchTrips)

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
 * - adults: Number (optional - default: 1)
 * - children: Number (optional - default: 0)
 * 
 * Requires: read permission on trips
 */
router.get("/", checkPermission("partners-management", "allocation", "read"), tripSearchController.searchTripsGet)

module.exports = router
