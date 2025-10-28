const { validationResult } = require("express-validator")
const {
  createTrip,
  listTrips,
  getTrip,
  updateTrip,
  deleteTrip,
  addAvailability,
  allocateToAgent,
  removeAllocation,
  removeAvailability,
  addTicketingRule,
  removeTicketingRule,
} = require("../services/tripService")

function handleValidation(req) {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    const err = new Error("Validation failed")
    err.status = 400
    err.details = errors.array()
    throw err
  }
}

async function create(req, res) {
  handleValidation(req)
  const trip = await createTrip(req.body)
  res.status(201).json(trip)
}

async function index(req, res) {
  const { page, limit, q, status, sortBy, sortOrder } = req.query
  const result = await listTrips({ page, limit, q, status, sortBy, sortOrder })
  res.json(result)
}

async function show(req, res) {
  const trip = await getTrip(req.params.id)
  if (!trip) {
    const err = new Error("Trip not found")
    err.status = 404
    throw err
  }
  res.json(trip)
}

async function patch(req, res) {
  handleValidation(req)
  const trip = await updateTrip(req.params.id, req.body)
  if (!trip) {
    const err = new Error("Trip not found")
    err.status = 404
    throw err
  }
  res.json(trip)
}

async function destroy(req, res) {
  await deleteTrip(req.params.id)
  res.json({ success: true })
}

// Availability Management
async function addAvailabilityHandler(req, res) {
  handleValidation(req)
  const trip = await addAvailability(req.params.id, req.body)
  res.status(201).json(trip)
}

async function allocateToAgentHandler(req, res) {
  handleValidation(req)
  const { availabilityId, agentId, allocatedQuantity } = req.body
  const trip = await allocateToAgent(req.params.id, availabilityId, agentId, allocatedQuantity)
  res.json(trip)
}

async function removeAllocationHandler(req, res) {
  const { availabilityId, allocationId } = req.body
  const trip = await removeAllocation(req.params.id, availabilityId, allocationId)
  res.json(trip)
}

async function removeAvailabilityHandler(req, res) {
  const { availabilityId } = req.body
  const trip = await removeAvailability(req.params.id, availabilityId)
  res.json(trip)
}

// Ticketing Rules
async function addTicketingRuleHandler(req, res) {
  handleValidation(req)
  const trip = await addTicketingRule(req.params.id, req.body)
  res.status(201).json(trip)
}

async function removeTicketingRuleHandler(req, res) {
  const { ruleId } = req.body
  const trip = await removeTicketingRule(req.params.id, ruleId)
  res.json(trip)
}

module.exports = {
  create,
  index,
  show,
  patch,
  destroy,
  addAvailabilityHandler,
  allocateToAgentHandler,
  removeAllocationHandler,
  removeAvailabilityHandler,
  addTicketingRuleHandler,
  removeTicketingRuleHandler,
}
