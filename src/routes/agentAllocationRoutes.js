const express = require("express")
const { checkPermission } = require("../middleware/permissionMiddleware")
const {
  listAgentAllocations,
  getAgentAllocationById,
  createAgentAllocation,
  updateAgentAllocation,
  deleteAgentAllocation,
  getAvailabilityForAllocation,
} = require("../controllers/agentAllocationController")

const router = express.Router({ mergeParams: true })

// GET /api/trips/:tripId/availabilities/:availabilityId/agent-allocations/summary - Get availability summary for allocation
router.get(
  "/:availabilityId/agent-allocations/summary",
  checkPermission("ship-trips", "trips", "read"),
  getAvailabilityForAllocation
)

// GET /api/trips/:tripId/availabilities/:availabilityId/agent-allocations - List all agent allocations
router.get("/:availabilityId/agent-allocations", checkPermission("ship-trips", "trips", "read"), listAgentAllocations)

// GET /api/trips/:tripId/availabilities/:availabilityId/agent-allocations/:allocationId - Get specific agent allocation
router.get(
  "/:availabilityId/agent-allocations/:allocationId",
  checkPermission("ship-trips", "trips", "read"),
  getAgentAllocationById
)

// POST /api/trips/:tripId/availabilities/:availabilityId/agent-allocations - Create agent allocation
router.post("/:availabilityId/agent-allocations", checkPermission("ship-trips", "trips", "write"), createAgentAllocation)

// PUT /api/trips/:tripId/availabilities/:availabilityId/agent-allocations/:allocationId - Update agent allocation
router.put(
  "/:availabilityId/agent-allocations/:allocationId",
  checkPermission("ship-trips", "trips", "edit"),
  updateAgentAllocation
)

// DELETE /api/trips/:tripId/availabilities/:availabilityId/agent-allocations/:allocationId - Delete agent allocation
router.delete(
  "/:availabilityId/agent-allocations/:allocationId",
  checkPermission("ship-trips", "trips", "delete"),
  deleteAgentAllocation
)

module.exports = router
