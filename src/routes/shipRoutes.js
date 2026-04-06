const express = require("express")
const router = express.Router()
const shipController = require("../controllers/shipController")
const { verifyToken, extractCompanyId, extractUserId } = require("../middleware/authMiddleware")
const { checkPermission } = require("../middleware/permissionMiddleware")
const { shipUpload } = require("../middleware/upload")

// ==================== AUTHENTICATION MIDDLEWARE ====================
// All routes require authentication and company extraction
router.use(verifyToken)
router.use(extractCompanyId)
router.use(extractUserId)

// ==================== SHIP MANAGEMENT ROUTES ====================

/**
 * GET /api/ships
 * List all ships for the company - requires read permission on ships
 */
router.get("/", checkPermission("ship-trips", "ships", "read"), shipController.listShips)

/**
 * GET /api/ships/:id
 * Get specific ship by ID - requires read permission on ships
 */
router.get("/:id", checkPermission("ship-trips", "ships", "read"), shipController.getShipById)

/**
 * POST /api/ships
 * Create a new ship - requires create permission on ships
 */
router.post("/", checkPermission("ship-trips", "ships", "create"), shipUpload.array("documents", 10), shipController.createShip)

/**
 * PUT /api/ships/:id
 * Update an existing ship - requires update permission on ships
 */
router.put("/:id", checkPermission("ship-trips", "ships", "update"), shipUpload.array("documents", 10), shipController.updateShip)

/**
 * DELETE /api/ships/:id
 * Delete a ship (soft delete) - requires delete permission on ships
 */
router.delete("/:id", checkPermission("ship-trips", "ships", "delete"), shipController.deleteShip)

module.exports = router
