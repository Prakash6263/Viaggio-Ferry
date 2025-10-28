const Trip = require("../models/Trip")

function sanitize(doc) {
  if (!doc) return null
  return doc.toObject({ versionKey: false })
}

async function createTrip(payload) {
  const data = {
    ...payload,
    availability: payload.availability || [],
    ticketingRules: payload.ticketingRules || [],
  }

  const doc = await Trip.create(data)
  return sanitize(doc)
}

async function listTrips({ page = 1, limit = 10, q = "", status = "", sortBy = "createdAt", sortOrder = "desc" }) {
  const filter = { isDeleted: false }

  if (q) {
    filter.$or = [{ tripName: { $regex: q, $options: "i" } }, { tripCode: { $regex: q, $options: "i" } }]
  }

  if (status) {
    filter.status = status
  }

  const pageNum = Math.max(Number.parseInt(page, 10) || 1, 1)
  const limitNum = Math.max(Number.parseInt(limit, 10) || 10, 1)
  const skip = (pageNum - 1) * limitNum

  const sortObj = {}
  sortObj[sortBy] = sortOrder === "asc" ? 1 : -1

  const [items, total] = await Promise.all([
    Trip.find(filter)
      .populate("vessel", "name code")
      .populate("departurePort", "name code")
      .populate("arrivalPort", "name code")
      .populate("promotion", "name")
      .populate("availability.allocations.agent", "name")
      .sort(sortObj)
      .skip(skip)
      .limit(limitNum),
    Trip.countDocuments(filter),
  ])

  return {
    items: items.map((d) => sanitize(d)),
    total,
    page: pageNum,
    limit: limitNum,
    pages: Math.ceil(total / limitNum),
  }
}

async function getTrip(id) {
  const doc = await Trip.findById(id)
    .populate("vessel", "name code")
    .populate("departurePort", "name code")
    .populate("arrivalPort", "name code")
    .populate("promotion", "name")
    .populate("availability.allocations.agent", "name")

  return sanitize(doc)
}

async function updateTrip(id, payload) {
  const doc = await Trip.findByIdAndUpdate(id, payload, { new: true, runValidators: true })
    .populate("vessel", "name code")
    .populate("departurePort", "name code")
    .populate("arrivalPort", "name code")
    .populate("promotion", "name")
    .populate("availability.allocations.agent", "name")

  return sanitize(doc)
}

async function deleteTrip(id) {
  await Trip.findByIdAndUpdate(id, { isDeleted: true })
  return { success: true }
}

// Availability Management
async function addAvailability(tripId, availabilityData) {
  const trip = await Trip.findById(tripId)
  if (!trip) {
    const err = new Error("Trip not found")
    err.status = 404
    throw err
  }

  const newAvailability = {
    _id: new (require("mongoose").Types.ObjectId)(),
    ...availabilityData,
    allocations: [],
  }

  trip.availability.push(newAvailability)
  await trip.save()

  return sanitize(trip)
}

async function allocateToAgent(tripId, availabilityId, agentId, allocatedQuantity) {
  const trip = await Trip.findById(tripId)
  if (!trip) {
    const err = new Error("Trip not found")
    err.status = 404
    throw err
  }

  const availability = trip.availability.id(availabilityId)
  if (!availability) {
    const err = new Error("Availability not found")
    err.status = 404
    throw err
  }

  // Check if agent already has allocation
  const existingAllocation = availability.allocations.find((a) => a.agent.toString() === agentId)
  if (existingAllocation) {
    existingAllocation.allocatedQuantity = allocatedQuantity
  } else {
    availability.allocations.push({
      _id: new (require("mongoose").Types.ObjectId)(),
      agent: agentId,
      allocatedQuantity,
      bookedQuantity: 0,
    })
  }

  await trip.save()
  return sanitize(trip)
}

async function removeAllocation(tripId, availabilityId, allocationId) {
  const trip = await Trip.findById(tripId)
  if (!trip) {
    const err = new Error("Trip not found")
    err.status = 404
    throw err
  }

  const availability = trip.availability.id(availabilityId)
  if (!availability) {
    const err = new Error("Availability not found")
    err.status = 404
    throw err
  }

  availability.allocations.id(allocationId).deleteOne()
  await trip.save()

  return sanitize(trip)
}

async function removeAvailability(tripId, availabilityId) {
  const trip = await Trip.findById(tripId)
  if (!trip) {
    const err = new Error("Trip not found")
    err.status = 404
    throw err
  }

  trip.availability.id(availabilityId).deleteOne()
  await trip.save()

  return sanitize(trip)
}

// Ticketing Rules
async function addTicketingRule(tripId, ruleData) {
  const trip = await Trip.findById(tripId)
  if (!trip) {
    const err = new Error("Trip not found")
    err.status = 404
    throw err
  }

  trip.ticketingRules.push({
    _id: new (require("mongoose").Types.ObjectId)(),
    ...ruleData,
  })

  await trip.save()
  return sanitize(trip)
}

async function removeTicketingRule(tripId, ruleId) {
  const trip = await Trip.findById(tripId)
  if (!trip) {
    const err = new Error("Trip not found")
    err.status = 404
    throw err
  }

  trip.ticketingRules.id(ruleId).deleteOne()
  await trip.save()

  return sanitize(trip)
}

module.exports = {
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
}
