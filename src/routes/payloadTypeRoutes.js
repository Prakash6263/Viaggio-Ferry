const express = require("express")
const router = express.Router()
const payloadTypeController = require("../controllers/payloadTypeController")
const { verifyToken, extractCompanyId, extractUserId } = require("../middleware/authMiddleware")
const { checkPermission } = require("../middleware/permissionMiddleware")
const validatePayloadType = require("../middleware/validatePayloadType")

// ==================== AUTHENTICATION MIDDLEWARE ====================
// All routes require authentication and company extraction
router.use(verifyToken)
router.use(extractCompanyId)
router.use(extractUserId)

// ==================== PAYLOAD TYPE MANAGEMENT ROUTES ====================

/**
 * GET /api/payload-types
 * List all payload types for the company - requires read permission on payload types
 */
router.get(
  "/",
  checkPermission("settings", "payload-type", "read"),
  payloadTypeController.listPayloadTypes
)

/**
 * GET /api/payload-types/:id
 * Get specific payload type by ID - requires read permission on payload types
 */
router.get(
  "/:id",
  checkPermission("settings", "payload-type", "read"),
  payloadTypeController.getPayloadTypeById
)

/**
 * POST /api/payload-types
 * Create a new payload type - requires create permission on payload types
 */
router.post(
  "/",
  checkPermission("settings", "payload-type", "create"),
  validatePayloadType,
  payloadTypeController.createPayloadType
)

/**
 * PUT /api/payload-types/:id
 * Update an existing payload type - requires update permission on payload types
 */
router.put(
  "/:id",
  checkPermission("settings", "payload-type", "update"),
  validatePayloadType,
  payloadTypeController.updatePayloadType
)

/**
 * DELETE /api/payload-types/:id
 * Delete a payload type (soft delete) - requires delete permission on payload types
 */
router.delete(
  "/:id",
  checkPermission("settings", "payload-type", "delete"),
  payloadTypeController.deletePayloadType
)

module.exports = router
