const express = require("express")
const router = express.Router()
const portController = require("../controllers/portController")
const { verifyToken, extractCompanyId, extractUserId } = require("../middleware/authMiddleware")
const { checkPermission } = require("../middleware/permissionMiddleware")

// ==================== AUTHENTICATION MIDDLEWARE ====================
// All routes require authentication and company extraction
router.use(verifyToken)
router.use(extractCompanyId)
router.use(extractUserId)

// ==================== PORT MANAGEMENT ROUTES ====================

/**
 * GET /api/ports
 * List all ports for the company - requires read permission on ports
 */
router.get(
  "/",
  checkPermission("settings", "ports", "read"),
  portController.listPorts
)

/**
 * GET /api/ports/:id
 * Get specific port by ID - requires read permission on ports
 */
router.get(
  "/:id",
  checkPermission("settings", "ports", "read"),
  portController.getPortById
)

/**
 * POST /api/ports
 * Create a new port - requires write permission on ports
 */
router.post(
  "/",
  checkPermission("settings", "ports", "write"),
  portController.createPort
)

/**
 * PUT /api/ports/:id
 * Update an existing port - requires edit permission on ports
 */
router.put(
  "/:id",
  checkPermission("settings", "ports", "edit"),
  portController.updatePort
)

/**
 * DELETE /api/ports/:id
 * Delete a port (soft delete) - requires delete permission on ports
 */
router.delete(
  "/:id",
  checkPermission("settings", "ports", "delete"),
  portController.deletePort
)

module.exports = router
