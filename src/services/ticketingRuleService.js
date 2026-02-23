const createHttpError = require("http-errors")
const { TicketingRule } = require("../models/TicketingRule")

/**
 * Calculate ticket penalty based on rule and timing
 * Implements strict penalty logic per rule type
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

    // Helper to calculate charge from penalty config
    const calculateCharge = (penaltyConfig, amount) => {
      if (!penaltyConfig || penaltyConfig.type === "NONE") return 0
      if (penaltyConfig.type === "FIXED") return parseFloat(penaltyConfig.value)
      if (penaltyConfig.type === "PERCENTAGE") return parseFloat((amount * penaltyConfig.value) / 100)
      return 0
    }

    // ===== VOID RULE =====
    if (ruleType === "VOID") {
      // Enforce: same calendar day of issue
      const isSameDay = issueDay.getTime() === nowDay.getTime()
      // Enforce: more than restrictedWindowHours before departure
      const isEnoughTimeBeforeETD = hoursBeforeDeparture > rule.restrictedWindowHours

      if (isSameDay && isEnoughTimeBeforeETD) {
        allowed = true
        mode = "ALLOWED"
        baseCharge = 0
        penaltyCharge = 0
      } else {
        allowed = false
        mode = "ALLOWED"
        baseCharge = 0
        penaltyCharge = 0
      }
    }
    // ===== REFUND or REISSUE RULE =====
    else if (ruleType === "REFUND" || ruleType === "REISSUE") {
      // Enforce: starting from startOffsetDays after issue
      const eligibleDay = new Date(issueDay.getTime() + rule.startOffsetDays * 24 * 60 * 60 * 1000)
      const isEligible = nowDay.getTime() >= eligibleDay.getTime()

      if (!isEligible) {
        // Before eligible day - not allowed
        allowed = false
        mode = "ALLOWED"
        baseCharge = 0
        penaltyCharge = 0
      } else {
        // Valid from eligible day onwards - check time window logic
        if (hoursBeforeDeparture > rule.restrictedWindowHours) {
          // Case 1: Beyond restricted window → ALLOWED with normalFee
          allowed = true
          mode = "ALLOWED"
          baseCharge = calculateCharge(rule.normalFee, baseAmount)
          penaltyCharge = 0
        } else if (hoursBeforeDeparture >= 0 && hoursBeforeDeparture <= rule.restrictedWindowHours) {
          // Case 2: Within restricted window → RESTRICTED with both fees
          allowed = true
          mode = "RESTRICTED"
          baseCharge = calculateCharge(rule.normalFee, baseAmount)
          penaltyCharge = calculateCharge(rule.restrictedPenalty, baseAmount)
        } else if (hoursBeforeDeparture < 0) {
          // Case 3: After ETD
          const ticketStatus = (ticket.status || "").toUpperCase()

          if (!["REFUNDED", "REISSUED"].includes(ticketStatus)) {
            // Ticket NOT already refunded/reissued → NO_SHOW
            allowed = true
            mode = "NO_SHOW"
            baseCharge = 0
            penaltyCharge = calculateCharge(rule.noShowPenalty, baseAmount)
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
