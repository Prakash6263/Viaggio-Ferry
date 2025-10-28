const express = require("express")
const router = express.Router()

const { asyncHandler } = require("../middleware/errorHandler")
const {
  createTripRules,
  updateTripRules,
  addAvailabilityRules,
  allocateToAgentRules,
  removeAllocationRules,
  removeAvailabilityRules,
  addTicketingRuleRules,
  removeTicketingRuleRules,
} = require("../validators/tripValidators")
const controller = require("../controllers/tripController")

// Trip CRUD
router.get("/", asyncHandler(controller.index))
router.post("/", createTripRules, asyncHandler(controller.create))
router.get("/:id", asyncHandler(controller.show))
router.patch("/:id", updateTripRules, asyncHandler(controller.patch))
router.delete("/:id", asyncHandler(controller.destroy))

// Availability Management
router.post("/:id/availability", addAvailabilityRules, asyncHandler(controller.addAvailabilityHandler))
router.post("/:id/availability/allocate", allocateToAgentRules, asyncHandler(controller.allocateToAgentHandler))
router.delete("/:id/availability/allocation", removeAllocationRules, asyncHandler(controller.removeAllocationHandler))
router.delete("/:id/availability", removeAvailabilityRules, asyncHandler(controller.removeAvailabilityHandler))

// Ticketing Rules
router.post("/:id/ticketing-rules", addTicketingRuleRules, asyncHandler(controller.addTicketingRuleHandler))
router.delete("/:id/ticketing-rules", removeTicketingRuleRules, asyncHandler(controller.removeTicketingRuleHandler))

module.exports = router
