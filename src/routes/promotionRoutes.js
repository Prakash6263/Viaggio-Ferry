const express = require("express")
const router = express.Router()
const promotionController = require("../controllers/promotionController")
const { verifyToken, extractCompanyId, extractUserId } = require("../middleware/authMiddleware")
const { checkPermission } = require("../middleware/permissionMiddleware")
const { validatePromotion } = require("../middleware/validatePromotion")

// Apply auth middleware to all routes
router.use(verifyToken)
router.use(extractCompanyId)
router.use(extractUserId)

/**
 * POST /api/promotions
 * Create a new promotion
 * Permission: partners-management > promotions > write
 */
router.post(
  "/",
  checkPermission("partners-management", "promotions", "write"),
  validatePromotion,
  promotionController.createPromotion,
)

/**
 * GET /api/promotions
 * List all promotions for the company
 * Permission: partners-management > promotions > read
 */
router.get(
  "/",
  checkPermission("partners-management", "promotions", "read"),
  promotionController.listPromotions,
)

/**
 * GET /api/promotions/active/list
 * Get currently active promotions (status = Active AND within date range)
 * NOTE: Must come before /:id route
 * Permission: partners-management > promotions > read
 */
router.get(
  "/active/list",
  checkPermission("partners-management", "promotions", "read"),
  promotionController.getActivePromotions,
)

/**
 * GET /api/promotions/trip/:tripId
 * Get promotions for a specific trip
 * NOTE: Must come before /:id route
 * Permission: partners-management > promotions > read
 */
router.get(
  "/trip/:tripId",
  checkPermission("partners-management", "promotions", "read"),
  promotionController.getPromotionsByTripId,
)

/**
 * GET /api/promotions/:id
 * Get a specific promotion
 * Permission: partners-management > promotions > read
 */
router.get(
  "/:id",
  checkPermission("partners-management", "promotions", "read"),
  promotionController.getPromotionById,
)

/**
 * PUT /api/promotions/:id
 * Update a promotion
 * Permission: partners-management > promotions > edit
 */
router.put(
  "/:id",
  checkPermission("partners-management", "promotions", "edit"),
  validatePromotion,
  promotionController.updatePromotion,
)

/**
 * DELETE /api/promotions/:id
 * Soft delete a promotion
 * Permission: partners-management > promotions > delete
 */
router.delete(
  "/:id",
  checkPermission("partners-management", "promotions", "delete"),
  promotionController.deletePromotion,
)

module.exports = router
