const express = require("express")
const router = express.Router()
const cabinController = require("../controllers/cabinController")
const { verifyToken, extractCompanyId, extractUserId } = require("../middleware/authMiddleware")
const { checkPermission } = require("../middleware/permissionMiddleware")

// ==================== AUTHENTICATION MIDDLEWARE ====================
// All routes require authentication and company extraction
router.use(verifyToken)
router.use(extractCompanyId)
router.use(extractUserId)

// ==================== CABIN MANAGEMENT ROUTES ====================

/**
 * GET /api/cabins
 * List all cabins for the company - requires read permission on cabins
 */
router.get(
  "/",
  checkPermission("settings", "cabins", "read"),
  cabinController.listCabins
)

/**
 * GET /api/cabins/:id
 * Get specific cabin by ID - requires read permission on cabins
 */
router.get(
  "/:id",
  checkPermission("settings", "cabins", "read"),
  cabinController.getCabinById
)

/**
 * POST /api/cabins
 * Create a new cabin - requires create permission on cabins
 */
router.post(
  "/",
  checkPermission("settings", "cabins", "create"),
  cabinController.createCabin
)

/**
 * PUT /api/cabins/:id
 * Update an existing cabin - requires update permission on cabins
 */
router.put(
  "/:id",
  checkPermission("settings", "cabins", "update"),
  cabinController.updateCabin
)

/**
 * DELETE /api/cabins/:id
 * Delete a cabin (soft delete) - requires delete permission on cabins
 */
router.delete(
  "/:id",
  checkPermission("settings", "cabins", "delete"),
  cabinController.deleteCabin
)

module.exports = router
