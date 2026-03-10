const express = require("express")
const router = express.Router()
const {
  createCommissionRule,
  listCommissionRules,
  getCommissionRule,
  updateCommissionRule,
  deleteCommissionRule,
  activateCommissionRule,
  getCommissionHistory,
} = require("../controllers/commissionRuleController")
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
 * Permission: partners-management > commission-board > write
 */
router.post(
  "/",
  checkPermission("partners-management", "commission-board", "write"),
  validateCommissionRule,
  createCommissionRule
)

/**
 * GET /api/commission-rules
 * List all commission rules for the company
 * Supports filters: layer, routeFrom, partnerScope, search
 * Permission: partners-management > commission-board > read
 */
router.get(
  "/",
  checkPermission("partners-management", "commission-board", "read"),
  listCommissionRules
)

/**
 * GET /api/commission-rules/history
 * Get history of commission rule actions
 * Supports filters: ruleId, actionType, dateRange
 * Permission: partners-management > commission-board > read
 */
router.get(
  "/history",
  checkPermission("partners-management", "commission-board", "read"),
  getCommissionHistory
)

/**
 * GET /api/commission-rules/:id
 * Get a specific commission rule
 * Permission: partners-management > commission-board > read
 */
router.get(
  "/:id",
  checkPermission("partners-management", "commission-board", "read"),
  getCommissionRule
)

/**
 * PUT /api/commission-rules/:id
 * Update a commission rule
 * Permission: partners-management > commission-board > edit
 */
router.put(
  "/:id",
  checkPermission("partners-management", "commission-board", "edit"),
  validateCommissionRule,
  updateCommissionRule
)

/**
 * PATCH /api/commission-rules/:id/activate
 * Activate an inactive commission rule
 * Permission: partners-management > commission-board > edit
 */
router.patch(
  "/:id/activate",
  checkPermission("partners-management", "commission-board", "edit"),
  activateCommissionRule
)

/**
 * DELETE /api/commission-rules/:id
 * Soft delete a commission rule
 * Permission: partners-management > commission-board > delete
 */
router.delete(
  "/:id",
  checkPermission("partners-management", "commission-board", "delete"),
  deleteCommissionRule
)

module.exports = router
