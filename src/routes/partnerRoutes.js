const express = require("express")
const router = express.Router()
const partnerController = require("../controllers/partnerController")
const { verifyToken, extractCompanyId, extractUserId, verifyAdminOrCompany } = require("../middleware/authMiddleware")
const { checkPermission } = require("../middleware/permissionMiddleware")

// ==================== AUTHENTICATION MIDDLEWARE ====================
router.use(verifyToken)
router.use(extractCompanyId)
router.use(extractUserId)

// ==================== PARTNER MANAGEMENT ROUTES ====================

/**
 * POST /api/partners
 * Create new partner - requires write permission on business-partners
 */
router.post(
  "/",
  checkPermission("partners-management", "business-partners", "write"),
  partnerController.createPartner
)

/**
 * GET /api/partners
 * List all partners with optional filters (layer, role, status)
 * Query params: ?layer=Marine&role=B2B_Marine_Partner&status=Active&page=1&limit=10
 */
router.get(
  "/",
  checkPermission("partners-management", "business-partners", "read"),
  partnerController.listPartners
)

/**
 * GET /api/partners/layer/:layer
 * Get all partners by layer (Marine, Commercial, Selling)
 * Query params: ?page=1&limit=10&status=Active
 */
router.get(
  "/layer/:layer",
  checkPermission("partners-management", "business-partners", "read"),
  partnerController.getPartnersByLayer
)

/**
 * GET /api/partners/all/layers
 * Get all partners across all layers with grouping by layer
 * Query params: ?page=1&limit=10&status=Active
 */
router.get(
  "/all/layers",
  checkPermission("partners-management", "business-partners", "read"),
  partnerController.getAllPartnersByAllLayers
)

/**
 * GET /api/partners/:id
 * Get partner details - requires read permission on business-partners
 */
router.get(
  "/:id",
  checkPermission("partners-management", "business-partners", "read"),
  partnerController.getPartnerById
)

/**
 * PUT /api/partners/:id
 * Update partner - requires edit permission on business-partners
 */
router.put(
  "/:id",
  checkPermission("partners-management", "business-partners", "edit"),
  partnerController.updatePartner
)

/**
 * PATCH /api/partners/:id/disable
 * Disable partner - requires edit permission on business-partners
 */
router.patch(
  "/:id/disable",
  checkPermission("partners-management", "business-partners", "edit"),
  partnerController.disablePartner
)

/**
 * PATCH /api/partners/:id/enable
 * Enable partner - requires edit permission on business-partners
 */
router.patch(
  "/:id/enable",
  checkPermission("partners-management", "business-partners", "edit"),
  partnerController.enablePartner
)

module.exports = router
