const createHttpError = require("http-errors")
const { TicketingRule } = require("../models/TicketingRule")

/**
 * Calculate ticket penalty based on rule and timing
 * Implements FINAL CLIENT RULES strictly:
 * - VOID: same-day only, >3 hours before ETD, no penalty
 * - REFUND/REISSUE: next-day rule, then 3-hour window logic
 * - NO_SHOW: auto-applied when refund/reissue within 3 hrs of ETD or after ETD (if not already refunded/reissued)
 * 
 * @param {Object} params
 * @param {Object} params.ticket - Ticket object with status, createdAt
 * @param {Object} params.trip - Trip object with ETD (date)
 * @param {string} params.ruleType - "VOID", "REFUND", or "REISSUE"
 * @param {Object} params.rule - TicketingRule document
 * @param {number} params.baseAmount - Original ticket amount (for percentage calculations)
 * @returns {Object} { allowed, mode, baseCharge, penaltyCharge, totalCharge, hoursBeforeDeparture }
 */
const calculateTicketPenalty = async ({
  ticket,
  trip,
  ruleType,
  rule,
  baseAmount = 0,
}) => {
  try {
    if (!ticket || !trip || !rule) {
      throw createHttpError(400, "Ticket, trip, and rule objects are required")
    }

    const now = new Date()
    const etd = new Date(trip.ETD || trip.etd)
    const issueDate = new Date(ticket.createdAt || ticket.issuedAt)

    // Normalize to start of day for same-day comparison
    const issueDay = new Date(issueDate.getFullYear(), issueDate.getMonth(), issueDate.getDate())
    const nowDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    // Calculate hours until departure (negative = past ETD)
    const hoursBeforeDeparture = (etd - now) / (1000 * 60 * 60)

    let allowed = false
    let mode = "ALLOWED"
    let baseCharge = 0
    let penaltyCharge = 0

    // ===== VOID RULE =====
    if (ruleType === "VOID") {
      // Enforce: same calendar day of issue
      const isSameDay = issueDay.getTime() === nowDay.getTime()

      // Enforce: more than 3 hours before departure
      const isMoreThan3HoursBefore = hoursBeforeDeparture > 3

      if (isSameDay && isMoreThan3HoursBefore) {
        allowed = true
        mode = "ALLOWED"
        baseCharge = 0
        penaltyCharge = 0
      } else {
        allowed = false
        mode = "ALLOWED" // Mode still ALLOWED, but allowed=false rejects the request
        baseCharge = 0
        penaltyCharge = 0
      }
    }
    // ===== REFUND or REISSUE RULE =====
    else if (ruleType === "REFUND" || ruleType === "REISSUE") {
      // Enforce: starting from next day after issue
      const nextDay = new Date(issueDay.getTime() + 24 * 60 * 60 * 1000)
      const isNextDayOrLater = nowDay.getTime() >= nextDay.getTime()

      if (!isNextDayOrLater) {
        // Before next day - not allowed
        allowed = false
        mode = "ALLOWED"
        baseCharge = 0
        penaltyCharge = 0
      } else {
        // Valid from next day onwards - check 3-hour window
        if (hoursBeforeDeparture > 3) {
          // Case 1: More than 3 hours before ETD → ALLOWED, no charge
          allowed = true
          mode = "ALLOWED"
          baseCharge = 0
          penaltyCharge = 0
        } else if (hoursBeforeDeparture >= 0 && hoursBeforeDeparture <= 3) {
          // Case 2: Within 3 hours before ETD → RESTRICTED with charges
          allowed = true
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
          if (rule.restrictedPenalty && rule.restrictedPenalty.feeType) {
            if (rule.restrictedPenalty.feeType === "FIXED") {
              penaltyCharge = parseFloat(rule.restrictedPenalty.feeValue)
            } else if (rule.restrictedPenalty.feeType === "PERCENTAGE") {
              penaltyCharge = parseFloat(
                (baseAmount * rule.restrictedPenalty.feeValue) / 100
              )
            }
          }
        } else if (hoursBeforeDeparture < 0) {
          // Case 3: After ETD
          const ticketStatus = (ticket.status || "").toUpperCase()

          if (!["REFUNDED", "REISSUED"].includes(ticketStatus)) {
            // Ticket NOT already refunded/reissued → NO_SHOW applies
            allowed = true
            mode = "NO_SHOW"
            baseCharge = 0

            // NO_SHOW: Apply restrictedPenalty only
            if (rule.restrictedPenalty && rule.restrictedPenalty.feeType) {
              if (rule.restrictedPenalty.feeType === "FIXED") {
                penaltyCharge = parseFloat(rule.restrictedPenalty.feeValue)
              } else if (rule.restrictedPenalty.feeType === "PERCENTAGE") {
                penaltyCharge = parseFloat(
                  (baseAmount * rule.restrictedPenalty.feeValue) / 100
                )
              }
            }
          } else {
            // Already refunded/reissued → no additional penalty
            allowed = true
            mode = "ALLOWED"
            baseCharge = 0
            penaltyCharge = 0
          }
        }
      }
    }

    // Never leave as undefined
    const totalCharge = parseFloat((baseCharge + penaltyCharge).toFixed(2))

    return {
      allowed,
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
