const createHttpError = require("http-errors")
const { TicketingRule } = require("../models/TicketingRule")

/**
 * Calculate ticket penalty based on rule and timing
 * Implements strict NO_SHOW logic per specification
 * 
 * @param {Object} params
 * @param {Object} params.ticket - Ticket object with status, createdAt
 * @param {Object} params.trip - Trip object with ETD (date)
 * @param {string} params.actionType - "REFUND" or "REISSUE"
 * @param {Object} params.rule - TicketingRule document
 * @param {number} params.baseAmount - Original ticket amount (for percentage calculations)
 * @returns {Object} { mode, baseCharge, penaltyCharge, totalCharge }
 */
const calculateTicketPenalty = async ({
  ticket,
  trip,
  actionType,
  rule,
  baseAmount = 0,
}) => {
  try {
    if (!ticket || !trip || !rule) {
      throw createHttpError(400, "Ticket, trip, and rule objects are required")
    }

    const now = new Date()
    const etd = new Date(trip.ETD || trip.etd)

    // Calculate hours until departure (can be negative if past ETD)
    const hoursBeforeDeparture = (etd - now) / (1000 * 60 * 60)

    let mode = "ALLOWED"
    let baseCharge = 0
    let penaltyCharge = 0

    // LOGIC DECISION TREE
    if (hoursBeforeDeparture > rule.restrictedWindowHours) {
      // Case 1: ALLOWED - Beyond restricted window
      mode = "ALLOWED"
      baseCharge = 0
      penaltyCharge = 0
    } else if (
      hoursBeforeDeparture >= 0 &&
      hoursBeforeDeparture <= rule.restrictedWindowHours
    ) {
      // Case 2: RESTRICTED - Within restricted window
      mode = "RESTRICTED"

      // Apply normalFee if configured
      if (rule.normalFeeType && rule.normalFeeValue !== null) {
        if (rule.normalFeeType === "FIXED") {
          baseCharge = parseFloat(rule.normalFeeValue)
        } else if (rule.normalFeeType === "PERCENTAGE") {
          baseCharge = parseFloat((baseAmount * rule.normalFeeValue) / 100)
        }
      }

      // Apply restrictedPenalty
      if (rule.restrictedPenalty.feeType === "FIXED") {
        penaltyCharge = parseFloat(rule.restrictedPenalty.feeValue)
      } else if (rule.restrictedPenalty.feeType === "PERCENTAGE") {
        penaltyCharge = parseFloat(
          (baseAmount * rule.restrictedPenalty.feeValue) / 100
        )
      }
    } else if (hoursBeforeDeparture < 0) {
      // Case 3: NO_SHOW - Past ETD
      // Only apply if ticket is not already REFUNDED/REISSUED and not BOARDED
      const ticketStatus = (ticket.status || "").toUpperCase()
      const boardingStatus = (ticket.boardingStatus || "").toUpperCase()

      if (
        !["REFUNDED", "REISSUED"].includes(ticketStatus) &&
        boardingStatus !== "BOARDED"
      ) {
        mode = "NO_SHOW"
        baseCharge = 0

        // NO_SHOW: Apply restrictedPenalty only
        if (rule.restrictedPenalty.feeType === "FIXED") {
          penaltyCharge = parseFloat(rule.restrictedPenalty.feeValue)
        } else if (rule.restrictedPenalty.feeType === "PERCENTAGE") {
          penaltyCharge = parseFloat(
            (baseAmount * rule.restrictedPenalty.feeValue) / 100
          )
        }
      } else {
        mode = "ALLOWED"
        baseCharge = 0
        penaltyCharge = 0
      }
    }

    const totalCharge = parseFloat((baseCharge + penaltyCharge).toFixed(2))

    return {
      mode,
      baseCharge: parseFloat(baseCharge.toFixed(2)),
      penaltyCharge: parseFloat(penaltyCharge.toFixed(2)),
      totalCharge,
      hoursBeforeDeparture: parseFloat(hoursBeforeDeparture.toFixed(2)),
    }
  } catch (error) {
    throw error
  }
}

/**
 * Get applicable rule for an action
 * 
 * @param {string} companyId
 * @param {string} ruleType - "VOID", "REFUND", or "REISSUE"
 * @param {string} payloadType - "PASSENGER", "CARGO", "VEHICLE", or "ALL"
 * @returns {Promise<Object|null>}
 */
const getApplicableRule = async (companyId, ruleType, payloadType) => {
  try {
    // Try exact payload type match first
    let rule = await TicketingRule.findOne({
      company: companyId,
      ruleType,
      payloadType,
      isDeleted: false,
    }).lean()

    // If not found, try "ALL" fallback
    if (!rule) {
      rule = await TicketingRule.findOne({
        company: companyId,
        ruleType,
        payloadType: "ALL",
        isDeleted: false,
      }).lean()
    }

    return rule || null
  } catch (error) {
    throw error
  }
}

module.exports = {
  calculateTicketPenalty,
  getApplicableRule,
}
