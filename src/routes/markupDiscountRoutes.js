const express = require("express")
const router = express.Router()
const markupDiscountController = require("../controllers/markupDiscountController")
const { verifyToken, extractCompanyId, extractUserId } = require("../middleware/authMiddleware")
const { checkPermission } = require("../middleware/permissionMiddleware")
const { validateMarkupDiscount } = require("../middleware/validateMarkupDiscount")

// Apply auth middleware to all routes
router.use(verifyToken)
router.use(extractCompanyId)
router.use(extractUserId)

/**
 * POST /api/markup-discounts
 * Create a new markup/discount rule
 * Permission: partners-management > markup-discounts > write
 */
router.post(
  "/",
  checkPermission("partners-management", "markup-discounts", "write"),
  validateMarkupDiscount,
  markupDiscountController.createMarkupDiscountRule
)

/**
 * GET /api/markup-discounts
 * List all markup/discount rules for the company
 * Supports filters: layer, routeFrom, serviceType, ruleType
 * Permission: partners-management > markup-discounts > read
 */
router.get(
  "/",
  checkPermission("partners-management", "markup-discounts", "read"),
  markupDiscountController.listMarkupDiscountRules
)

/**
 * GET /api/markup-discounts/:id
 * Get a specific markup/discount rule
 * Permission: partners-management > markup-discounts > read
 */
router.get(
  "/:id",
  checkPermission("partners-management", "markup-discounts", "read"),
  markupDiscountController.getMarkupDiscountRule
)

/**
 * PUT /api/markup-discounts/:id
 * Update a markup/discount rule
 * Permission: partners-management > markup-discounts > edit
 */
router.put(
  "/:id",
  checkPermission("partners-management", "markup-discounts", "edit"),
  validateMarkupDiscount,
  markupDiscountController.updateMarkupDiscountRule
)

/**
 * DELETE /api/markup-discounts/:id
 * Soft delete a markup/discount rule
 * Permission: partners-management > markup-discounts > delete
 */
router.delete(
  "/:id",
  checkPermission("partners-management", "markup-discounts", "delete"),
  markupDiscountController.deleteMarkupDiscountRule
)

module.exports = router
