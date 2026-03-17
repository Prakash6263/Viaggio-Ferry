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
 * Permission: partners_management > promotion > write
 */
router.post(
  "/",
  checkPermission("partners_management", "promotion", "write"),
  validatePromotion,
  promotionController.createPromotion,
)

/**
 * GET /api/promotions
 * List all promotions for the company
 * Permission: partners_management > promotion > read
 */
router.get(
  "/",
  checkPermission("partners_management", "promotion", "read"),
  promotionController.listPromotions,
)

/**
 * GET /api/promotions/active/list
 * Get active promotions (date and status filtered)
 * NOTE: Must come before /:id route
 * Permission: partners_management > promotion > read
 */
router.get(
  "/active/list",
  checkPermission("partners_management", "promotion", "read"),
  promotionController.getActivePromotions,
)

/**
 * GET /api/promotions/trip/:tripId
 * Get promotions for a specific trip
 * NOTE: Must come before /:id route
 * Permission: partners_management > promotion > read
 */
router.get(
  "/trip/:tripId",
  checkPermission("partners_management", "promotion", "read"),
  promotionController.getPromotionsByTripId,
)

/**
 * GET /api/promotions/:id
 * Get a specific promotion
 * Permission: partners_management > promotion > read
 */
router.get(
  "/:id",
  checkPermission("partners_management", "promotion", "read"),
  promotionController.getPromotionById,
)

/**
 * PUT /api/promotions/:id
 * Update a promotion
 * Permission: partners_management > promotion > edit
 */
router.put(
  "/:id",
  checkPermission("partners_management", "promotion", "edit"),
  validatePromotion,
  promotionController.updatePromotion,
)

/**
 * DELETE /api/promotions/:id
 * Soft delete a promotion
 * Permission: partners_management > promotion > delete
 */
router.delete(
  "/:id",
  checkPermission("partners_management", "promotion", "delete"),
  promotionController.deletePromotion,
)

module.exports = router
