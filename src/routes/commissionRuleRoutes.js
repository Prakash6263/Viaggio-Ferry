const express = require("express")
const router = express.Router()
const commissionRuleController = require("../controllers/commissionRuleController")
const { verifyToken, extractCompanyId, extractUserId } = require("../middleware/authMiddleware")
const { checkPermission } = require("../middleware/permissionMiddleware")
const { validateCommissionRule } = require("../middleware/validateCommissionRule")

// Apply auth middleware to all routes
router.use(verifyToken)
router.use(extractCompanyId)
router.use(extractUserId)

/**
 * POST /api/commission-rules
 * Create a new commission rule
 * Permission: partners-management > commissions > write
 */
router.post(
  "/",
  checkPermission("partners-management", "commissions", "write"),
  validateCommissionRule,
  commissionRuleController.createCommissionRule
)

/**
 * GET /api/commission-rules
 * List all commission rules for the company
 * Supports filters: layer, routeFrom, partnerScope, search
 * Permission: partners-management > commissions > read
 */
router.get(
  "/",
  checkPermission("partners-management", "commissions", "read"),
  commissionRuleController.listCommissionRules
)

/**
 * GET /api/commission-rules/history
 * Get history of commission rule actions
 * Supports filters: ruleId, actionType, dateRange
 * Permission: partners-management > commissions > read
 * NOTE: This must come before /:id route to avoid being caught by it
 */
router.get(
  "/history",
  checkPermission("partners-management", "commissions", "read"),
  commissionRuleController.getCommissionHistory
)

/**
 * GET /api/commission-rules/:id
 * Get a specific commission rule
 * Permission: partners-management > commissions > read
 */
router.get(
  "/:id",
  checkPermission("partners-management", "commissions", "read"),
  commissionRuleController.getCommissionRule
)

/**
 * PUT /api/commission-rules/:id
 * Update a commission rule
 * Permission: partners-management > commissions > edit
 */
router.put(
  "/:id",
  checkPermission("partners-management", "commissions", "edit"),
  validateCommissionRule,
  commissionRuleController.updateCommissionRule
)

/**
 * PATCH /api/commission-rules/:id/activate
 * Activate an inactive commission rule
 * Permission: partners-management > commissions > edit
 */
router.patch(
  "/:id/activate",
  checkPermission("partners-management", "commissions", "edit"),
  commissionRuleController.activateCommissionRule
)

/**
 * DELETE /api/commission-rules/:id
 * Soft delete a commission rule
 * Permission: partners-management > commissions > delete
 */
router.delete(
  "/:id",
  checkPermission("partners-management", "commissions", "delete"),
  commissionRuleController.deleteCommissionRule
)

module.exports = router
