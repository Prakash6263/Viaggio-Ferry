const express = require("express")
const router = express.Router({ mergeParams: true })
const tripTicketingRuleController = require("../controllers/tripTicketingRuleController")

const { verifyToken, extractCompanyId, extractUserId } = require("../middleware/authMiddleware")
const { checkPermission } = require("../middleware/permissionMiddleware")

// ==================== AUTHENTICATION MIDDLEWARE ====================
router.use(verifyToken)
router.use(extractCompanyId)
router.use(extractUserId)

// ==================== TRIP TICKETING RULES MANAGEMENT ====================

/**
 * GET /api/trips/:tripId/ticketing-rules
 * List all ticketing rules for a specific trip
 */
router.get("/", checkPermission("ship-trips", "trips", "read"), tripTicketingRuleController.listTripTicketingRules)

/**
 * POST /api/trips/:tripId/ticketing-rules
 * Add a ticketing rule to a trip
 */
router.post("/", checkPermission("ship-trips", "trips", "write"), tripTicketingRuleController.addTripTicketingRule)

/**
 * POST /api/trips/:tripId/ticketing-rules/reorder
 * Reorder trip ticketing rules (bulk position update)
 */
router.post("/reorder", checkPermission("ship-trips", "trips", "edit"), tripTicketingRuleController.reorderTripTicketingRules)

/**
 * GET /api/trips/:tripId/ticketing-rules/:ruleId
 * Get specific ticketing rule for a trip
 */
router.get("/:ruleId", checkPermission("ship-trips", "trips", "read"), tripTicketingRuleController.getTripTicketingRule)

/**
 * PUT /api/trips/:tripId/ticketing-rules/:ruleId
 * Update a trip ticketing rule
 */
router.put("/:ruleId", checkPermission("ship-trips", "trips", "edit"), tripTicketingRuleController.updateTripTicketingRule)

/**
 * DELETE /api/trips/:tripId/ticketing-rules/:ruleId
 * Remove a ticketing rule from a trip
 */
router.delete("/:ruleId", checkPermission("ship-trips", "trips", "delete"), tripTicketingRuleController.removeTripTicketingRule)

module.exports = router
