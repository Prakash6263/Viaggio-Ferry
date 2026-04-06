const express = require("express")
const router = express.Router()
const ticketingRuleController = require("../controllers/ticketingRuleController")
const { verifyToken, extractCompanyId, extractUserId } = require("../middleware/authMiddleware")
const { checkPermission } = require("../middleware/permissionMiddleware")

// Apply auth middleware to all routes
router.use(verifyToken)
router.use(extractCompanyId)
router.use(extractUserId)

// POST   /api/ticketing-rules - Create
router.post(
  "/",
  checkPermission("sales-bookings", "ticketing-rules", "write"),
  ticketingRuleController.createTicketingRule
)

// GET    /api/ticketing-rules - List (with pagination, search, filters)
router.get(
  "/",
  checkPermission("sales-bookings", "ticketing-rules", "read"),
  ticketingRuleController.listTicketingRules
)

// GET    /api/ticketing-rules/:id - Get by ID
router.get(
  "/:id",
  checkPermission("sales-bookings", "ticketing-rules", "read"),
  ticketingRuleController.getTicketingRule
)

// PUT    /api/ticketing-rules/:id - Update
router.put(
  "/:id",
  checkPermission("sales-bookings", "ticketing-rules", "edit"),
  ticketingRuleController.updateTicketingRule
)

// DELETE /api/ticketing-rules/:id - Soft delete
router.delete(
  "/:id",
  checkPermission("sales-bookings", "ticketing-rules", "delete"),
  ticketingRuleController.deleteTicketingRule
)

module.exports = router
