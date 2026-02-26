const createHttpError = require("http-errors")
const {
  createTripTicketRule,
  updateTripTicketRule,
  deleteTripTicketRule,
  getTripTicketRules,
} = require("../services/tripTicketRuleService")

/**
 * POST /api/trips/:tripId/ticketing-rules
 * Assign a ticketing rule to a trip
 */
const assignRuleToTrip = async (req, res, next) => {
  try {
    const { companyId, user } = req
    const { tripId } = req.params
    const { ruleType, ticketingRule } = req.body

    if (!companyId) {
      throw createHttpError(400, "Company ID is required")
    }

    const rule = await createTripTicketRule(companyId, tripId, ruleType, ticketingRule, user)

    return res.status(201).json({
      success: true,
      message: "Rule assigned successfully",
      data: rule,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * PUT /api/trips/:tripId/ticketing-rules/:id
 * Update a trip ticket rule
 */
const updateTripRule = async (req, res, next) => {
  try {
    const { companyId, user } = req
    const { tripId, id } = req.params
    const updateData = req.body

    if (!companyId) {
      throw createHttpError(400, "Company ID is required")
    }

    const rule = await updateTripTicketRule(companyId, tripId, id, updateData, user)

    return res.status(200).json({
      success: true,
      message: "Rule updated successfully",
      data: rule,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * DELETE /api/trips/:tripId/ticketing-rules/:id
 * Delete a trip ticket rule (soft delete)
 */
const removeTripRule = async (req, res, next) => {
  try {
    const { companyId, user } = req
    const { tripId, id } = req.params

    if (!companyId) {
      throw createHttpError(400, "Company ID is required")
    }

    await deleteTripTicketRule(companyId, tripId, id, user)

    return res.status(200).json({
      success: true,
      message: "Rule deleted successfully",
    })
  } catch (error) {
    next(error)
  }
}

/**
 * GET /api/trips/:tripId/ticketing-rules
 * Get all rules assigned to a trip
 */
const getTripRules = async (req, res, next) => {
  try {
    const { companyId } = req
    const { tripId } = req.params

    if (!companyId) {
      throw createHttpError(400, "Company ID is required")
    }

    const rules = await getTripTicketRules(companyId, tripId)

    return res.status(200).json({
      success: true,
      message: "Rules retrieved successfully",
      data: rules,
      total: rules.length,
    })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  assignRuleToTrip,
  updateTripRule,
  removeTripRule,
  getTripRules,
}
