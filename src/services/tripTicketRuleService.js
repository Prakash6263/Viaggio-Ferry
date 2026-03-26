const createHttpError = require("http-errors")
const mongoose = require("mongoose")
const { TripTicketRule } = require("../models/TripTicketRule")
const { Trip } = require("../models/Trip")
const { TicketingRule } = require("../models/TicketingRule")
const { PassengerBooking } = require("../models/PassengerBooking")
const { CargoBooking } = require("../models/CargoBooking")
const { VehicleBooking } = require("../models/VehicleBooking")

/**
 * Helper function to build actor object
 */
function buildActor(user) {
  if (!user) {
    return { type: "system", name: "System" }
  }

  if (user.role === "company") {
    return {
      id: user.id,
      name: user.email,
      type: "company",
    }
  }

  return {
    id: user.id,
    name: user.email,
    type: "user",
    layer: user.layer,
  }
}

/**
 * Validate that trip exists and belongs to company
 */
async function validateTripExists(tripId, companyId) {
  if (!mongoose.Types.ObjectId.isValid(tripId)) {
    throw createHttpError(400, "Invalid trip ID format")
  }

  const trip = await Trip.findOne({
    _id: tripId,
    company: companyId,
    isDeleted: false,
  })

  if (!trip) {
    throw createHttpError(404, "Trip not found")
  }

  return trip
}

/**
 * Validate that ticketing rule exists, is active, and belongs to company
 */
async function validateTicketingRuleExists(ruleId, companyId) {
  if (!mongoose.Types.ObjectId.isValid(ruleId)) {
    throw createHttpError(400, "Invalid ticketing rule ID format")
  }

  const rule = await TicketingRule.findOne({
    _id: ruleId,
    company: companyId,
    isDeleted: false,
  })

  if (!rule) {
    throw createHttpError(404, "Ticketing rule not found")
  }

  if (!rule.isActive) {
    throw createHttpError(400, "Ticketing rule is not active")
  }

  return rule
}

/**
 * Validate that rule type matches ticketing rule type
 */function validateRuleTypeMatch(ruleType, ticketingRule) {
  if (ruleType !== ticketingRule.ruleType) {
    throw createHttpError(400, "Rule type mismatch")
  }
}

/**
 * Check if trip already has this rule type assigned
 */
async function checkDuplicateRuleType(tripId, ruleType, excludeId = null) {
  const query = {
    trip: tripId,
    ruleType: ruleType,
    isDeleted: false,
  }

  if (excludeId) {
    query._id = { $ne: excludeId }
  }

  const existing = await TripTicketRule.findOne(query)

  if (existing) {
    throw createHttpError(400, "Duplicate rule type not allowed for trip")
  }
}

/**
 * Check if trip has any bookings
 */
async function checkTripHasBookings(tripId, companyId) {
  const passengerBooking = await PassengerBooking.findOne({
    company: companyId,
    $or: [{ outboundTrip: tripId }, { returnTrip: tripId }],
    bookingStatus: { $ne: "Cancelled" },
  })

  if (passengerBooking) {
    return true
  }

  const cargoBooking = await CargoBooking.findOne({
    company: companyId,
    trip: tripId,
    bookingStatus: { $ne: "Cancelled" },
  })

  if (cargoBooking) {
    return true
  }

  const vehicleBooking = await VehicleBooking.findOne({
    company: companyId,
    trip: tripId,
    bookingStatus: { $ne: "Cancelled" },
  })

  if (vehicleBooking) {
    return true
  }

  return false
}

/**
 * Create a new trip ticket rule
 */
async function createTripTicketRule(companyId, tripId, ruleType, ticketingRuleId, user) {
  // Validate trip exists
  const trip = await validateTripExists(tripId, companyId)

  // Validate ticketing rule exists
  const ticketingRule = await validateTicketingRuleExists(ticketingRuleId, companyId)

  // Validate rule type match
  validateRuleTypeMatch(ruleType, ticketingRule)

  // Check for duplicates
  await checkDuplicateRuleType(tripId, ruleType)

  // Check if trip has bookings
  const hasBookings = await checkTripHasBookings(tripId, companyId)
  if (hasBookings) {
    throw createHttpError(400, "Cannot modify ticket rules after bookings exist")
  }

  const actor = buildActor(user)

  const newRule = await TripTicketRule.create({
    company: companyId,
    trip: tripId,
    ruleType,
    ticketingRule: ticketingRuleId,
    isActive: true,
    createdBy: actor,
    updatedBy: actor,
  })

  return newRule
}

/**
 * Update a trip ticket rule
 */
async function updateTripTicketRule(companyId, tripId, ruleId, updateData, user) {
  // Validate trip exists
  const trip = await validateTripExists(tripId, companyId)

  // Check if trip has bookings
  const hasBookings = await checkTripHasBookings(tripId, companyId)
  if (hasBookings) {
    throw createHttpError(400, "Cannot modify ticket rules after bookings exist")
  }

  // Get existing rule
  if (!mongoose.Types.ObjectId.isValid(ruleId)) {
    throw createHttpError(400, "Invalid rule ID format")
  }

  const existingRule = await TripTicketRule.findOne({
    _id: ruleId,
    trip: tripId,
    company: companyId,
    isDeleted: false,
  })

  if (!existingRule) {
    throw createHttpError(404, "Ticket rule not found for this trip")
  }

  // If updating ticketing rule or rule type
  if (updateData.ticketingRule || updateData.ruleType) {
    const ticketingRuleId = updateData.ticketingRule || existingRule.ticketingRule
    const ruleType = updateData.ruleType || existingRule.ruleType

    // Validate ticketing rule exists
    const ticketingRule = await validateTicketingRuleExists(ticketingRuleId, companyId)

    // Validate rule type match
    validateRuleTypeMatch(ruleType, ticketingRule)

    // Check for duplicate rule type (excluding current rule)
    if (updateData.ruleType !== existingRule.ruleType) {
      await checkDuplicateRuleType(tripId, ruleType, ruleId)
    }
  }

  const actor = buildActor(user)

  const updatedRule = await TripTicketRule.findByIdAndUpdate(
    ruleId,
    {
      ...updateData,
      updatedBy: actor,
    },
    { new: true, runValidators: true }
  )

  return updatedRule
}

/**
 * Delete a trip ticket rule (soft delete)
 */
async function deleteTripTicketRule(companyId, tripId, ruleId, user) {
  // Validate trip exists
  const trip = await validateTripExists(tripId, companyId)

  // Check if trip has bookings
  const hasBookings = await checkTripHasBookings(tripId, companyId)
  if (hasBookings) {
    throw createHttpError(400, "Cannot modify ticket rules after bookings exist")
  }

  if (!mongoose.Types.ObjectId.isValid(ruleId)) {
    throw createHttpError(400, "Invalid rule ID format")
  }

  const actor = buildActor(user)

  const deletedRule = await TripTicketRule.findByIdAndUpdate(
    ruleId,
    {
      isDeleted: true,
      updatedBy: actor,
    },
    { new: true }
  )

  if (!deletedRule) {
    throw createHttpError(404, "Ticket rule not found")
  }

  return deletedRule
}

/**
 * Get all rules for a trip
 */
async function getTripTicketRules(companyId, tripId) {
  // Validate trip exists
  const trip = await validateTripExists(tripId, companyId)

  const rules = await TripTicketRule.find({
    company: companyId,
    trip: tripId,
    isDeleted: false,
  })
    .populate({
      path: "ticketingRule",
      select:
        "ruleName restrictedWindowHours normalFee restrictedPenalty noShowPenalty conditions ruleType",
    })
    .lean()

  return rules
}

module.exports = {
  createTripTicketRule,
  updateTripTicketRule,
  deleteTripTicketRule,
  getTripTicketRules,
  validateTripExists,
  validateTicketingRuleExists,
  checkTripHasBookings,
}
