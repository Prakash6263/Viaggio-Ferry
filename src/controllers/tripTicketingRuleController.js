const createHttpError = require("http-errors")
const mongoose = require("mongoose")
const { TripTicketingRule } = require("../models/TripTicketingRule")
const { Trip } = require("../models/Trip")
const { TicketingRule } = require("../models/TicketingRule")

/**
 * GET /api/trips/:tripId/ticketing-rules
 * List all ticketing rules for a specific trip
 */
const listTripTicketingRules = async (req, res, next) => {
  try {
    const { tripId } = req.params
    const { companyId } = req

    if (!companyId) {
      throw createHttpError(400, "Company ID is required")
    }

    if (!tripId || !mongoose.Types.ObjectId.isValid(tripId)) {
      throw createHttpError(400, "Valid trip ID is required")
    }

    // Verify trip exists and belongs to company
    const trip = await Trip.findOne({ _id: tripId, company: companyId, isDeleted: false })
    if (!trip) {
      throw createHttpError(404, "Trip not found")
    }

    // Fetch rules with populated ticketing rule details
    const rules = await TripTicketingRule.find({
      trip: tripId,
      company: companyId,
      isDeleted: false,
    })
      .populate("ticketingRule", "ruleType ruleName sameDayOnly startOffsetDays restrictedWindowHours normalFee restrictedPenalty noShowPenalty conditions")
      .sort({ position: 1, createdAt: 1 })
      .lean()

    res.json({
      success: true,
      data: rules,
      count: rules.length,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * GET /api/trips/:tripId/ticketing-rules/:ruleId
 * Get specific ticketing rule for a trip
 */
const getTripTicketingRule = async (req, res, next) => {
  try {
    const { tripId, ruleId } = req.params
    const { companyId } = req

    if (!companyId) {
      throw createHttpError(400, "Company ID is required")
    }

    if (!tripId || !mongoose.Types.ObjectId.isValid(tripId)) {
      throw createHttpError(400, "Valid trip ID is required")
    }

    if (!ruleId || !mongoose.Types.ObjectId.isValid(ruleId)) {
      throw createHttpError(400, "Valid rule ID is required")
    }

    // Verify trip exists
    const trip = await Trip.findOne({ _id: tripId, company: companyId, isDeleted: false })
    if (!trip) {
      throw createHttpError(404, "Trip not found")
    }

    const rule = await TripTicketingRule.findOne({
      _id: ruleId,
      trip: tripId,
      company: companyId,
      isDeleted: false,
    }).populate("ticketingRule")

    if (!rule) {
      throw createHttpError(404, "Ticketing rule not found for this trip")
    }

    res.json({
      success: true,
      data: rule,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * POST /api/trips/:tripId/ticketing-rules
 * Add a ticketing rule to a trip
 */
const addTripTicketingRule = async (req, res, next) => {
  try {
    const { tripId } = req.params
    const { companyId, userId } = req
    const { ticketingRuleId, position } = req.body

    // Validation
    if (!companyId) {
      throw createHttpError(400, "Company ID is required")
    }

    if (!userId) {
      throw createHttpError(400, "User ID is required")
    }

    if (!tripId || !mongoose.Types.ObjectId.isValid(tripId)) {
      throw createHttpError(400, "Valid trip ID is required")
    }

    if (!ticketingRuleId || !mongoose.Types.ObjectId.isValid(ticketingRuleId)) {
      throw createHttpError(400, "Valid ticketing rule ID is required")
    }

    // Verify trip exists and belongs to company
    const trip = await Trip.findOne({ _id: tripId, company: companyId, isDeleted: false })
    if (!trip) {
      throw createHttpError(404, "Trip not found")
    }

    // Verify ticketing rule exists and belongs to company
    const ticketingRule = await TicketingRule.findOne({
      _id: ticketingRuleId,
      company: companyId,
      isDeleted: false,
    })
    if (!ticketingRule) {
      throw createHttpError(404, "Ticketing rule not found")
    }

    // Check if rule is already added to this trip
    const existingRule = await TripTicketingRule.findOne({
      trip: tripId,
      ticketingRule: ticketingRuleId,
      isDeleted: false,
    })
    if (existingRule) {
      throw createHttpError(400, "This ticketing rule is already added to the trip")
    }

    // Get next position if not provided
    let rulePosition = position
    if (rulePosition === undefined || rulePosition === null) {
      const lastRule = await TripTicketingRule.findOne({
        trip: tripId,
        isDeleted: false,
      })
        .sort({ position: -1 })
        .lean()
      rulePosition = (lastRule?.position || 0) + 1
    }

    // Create new trip ticketing rule
    const newRule = new TripTicketingRule({
      trip: tripId,
      company: companyId,
      ticketingRule: ticketingRuleId,
      ruleType: ticketingRule.ruleType,
      ruleName: ticketingRule.ruleName,
      position: rulePosition,
      createdBy: userId,
    })

    const savedRule = await newRule.save()
    const populatedRule = await TripTicketingRule.findById(savedRule._id).populate(
      "ticketingRule",
      "ruleType ruleName sameDayOnly startOffsetDays restrictedWindowHours normalFee restrictedPenalty noShowPenalty conditions"
    )

    res.status(201).json({
      success: true,
      data: populatedRule,
      message: "Ticketing rule added to trip successfully",
    })
  } catch (error) {
    next(error)
  }
}

/**
 * PUT /api/trips/:tripId/ticketing-rules/:ruleId
 * Update a trip ticketing rule (e.g., change position)
 */
const updateTripTicketingRule = async (req, res, next) => {
  try {
    const { tripId, ruleId } = req.params
    const { companyId, userId } = req
    const { position } = req.body

    if (!companyId) {
      throw createHttpError(400, "Company ID is required")
    }

    if (!userId) {
      throw createHttpError(400, "User ID is required")
    }

    if (!tripId || !mongoose.Types.ObjectId.isValid(tripId)) {
      throw createHttpError(400, "Valid trip ID is required")
    }

    if (!ruleId || !mongoose.Types.ObjectId.isValid(ruleId)) {
      throw createHttpError(400, "Valid rule ID is required")
    }

    // Verify trip exists
    const trip = await Trip.findOne({ _id: tripId, company: companyId, isDeleted: false })
    if (!trip) {
      throw createHttpError(404, "Trip not found")
    }

    // Find and update rule
    const rule = await TripTicketingRule.findOne({
      _id: ruleId,
      trip: tripId,
      company: companyId,
      isDeleted: false,
    })

    if (!rule) {
      throw createHttpError(404, "Ticketing rule not found for this trip")
    }

    // Update position if provided
    if (position !== undefined && position !== null) {
      if (typeof position !== "number" || position < 0) {
        throw createHttpError(400, "Position must be a non-negative number")
      }
      rule.position = position
    }

    rule.updatedBy = userId
    const updatedRule = await rule.save()
    const populatedRule = await TripTicketingRule.findById(updatedRule._id).populate(
      "ticketingRule",
      "ruleType ruleName sameDayOnly startOffsetDays restrictedWindowHours normalFee restrictedPenalty noShowPenalty conditions"
    )

    res.json({
      success: true,
      data: populatedRule,
      message: "Ticketing rule updated successfully",
    })
  } catch (error) {
    next(error)
  }
}

/**
 * DELETE /api/trips/:tripId/ticketing-rules/:ruleId
 * Remove a ticketing rule from a trip (soft delete)
 */
const removeTripTicketingRule = async (req, res, next) => {
  try {
    const { tripId, ruleId } = req.params
    const { companyId, userId } = req

    if (!companyId) {
      throw createHttpError(400, "Company ID is required")
    }

    if (!userId) {
      throw createHttpError(400, "User ID is required")
    }

    if (!tripId || !mongoose.Types.ObjectId.isValid(tripId)) {
      throw createHttpError(400, "Valid trip ID is required")
    }

    if (!ruleId || !mongoose.Types.ObjectId.isValid(ruleId)) {
      throw createHttpError(400, "Valid rule ID is required")
    }

    // Verify trip exists
    const trip = await Trip.findOne({ _id: tripId, company: companyId, isDeleted: false })
    if (!trip) {
      throw createHttpError(404, "Trip not found")
    }

    // Find and soft delete rule
    const rule = await TripTicketingRule.findOne({
      _id: ruleId,
      trip: tripId,
      company: companyId,
      isDeleted: false,
    })

    if (!rule) {
      throw createHttpError(404, "Ticketing rule not found for this trip")
    }

    rule.isDeleted = true
    rule.updatedBy = userId
    await rule.save()

    res.json({
      success: true,
      message: "Ticketing rule removed from trip successfully",
    })
  } catch (error) {
    next(error)
  }
}

/**
 * POST /api/trips/:tripId/ticketing-rules/reorder
 * Reorder multiple rules (update positions)
 */
const reorderTripTicketingRules = async (req, res, next) => {
  try {
    const { tripId } = req.params
    const { companyId, userId } = req
    const { rules } = req.body

    if (!companyId) {
      throw createHttpError(400, "Company ID is required")
    }

    if (!userId) {
      throw createHttpError(400, "User ID is required")
    }

    if (!tripId || !mongoose.Types.ObjectId.isValid(tripId)) {
      throw createHttpError(400, "Valid trip ID is required")
    }

    if (!Array.isArray(rules) || rules.length === 0) {
      throw createHttpError(400, "Rules array with at least one rule is required")
    }

    // Verify trip exists
    const trip = await Trip.findOne({ _id: tripId, company: companyId, isDeleted: false })
    if (!trip) {
      throw createHttpError(404, "Trip not found")
    }

    // Update all rules with new positions
    const updatePromises = rules.map((item, index) => {
      if (!item.ruleId || !mongoose.Types.ObjectId.isValid(item.ruleId)) {
        throw createHttpError(400, `Invalid rule ID at position ${index}`)
      }
      return TripTicketingRule.updateOne(
        {
          _id: item.ruleId,
          trip: tripId,
          company: companyId,
          isDeleted: false,
        },
        {
          position: item.position || index,
          updatedBy: userId,
        }
      )
    })

    await Promise.all(updatePromises)

    // Fetch updated rules
    const updatedRules = await TripTicketingRule.find({
      trip: tripId,
      company: companyId,
      isDeleted: false,
    })
      .populate("ticketingRule", "ruleType ruleName sameDayOnly startOffsetDays restrictedWindowHours normalFee restrictedPenalty noShowPenalty conditions")
      .sort({ position: 1 })
      .lean()

    res.json({
      success: true,
      data: updatedRules,
      message: "Ticketing rules reordered successfully",
    })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  listTripTicketingRules,
  getTripTicketingRule,
  addTripTicketingRule,
  updateTripTicketingRule,
  removeTripTicketingRule,
  reorderTripTicketingRules,
}
