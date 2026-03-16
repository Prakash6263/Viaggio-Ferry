const { MarkupDiscountRule } = require("../models/MarkupDiscountRule")
const { CommissionRule } = require("../models/CommissionRule")

/**
 * Layer hierarchy mapping - higher value = higher precedence
 * Used for sorting: higher values come first
 */
const LAYER_HIERARCHY = {
  "Selling Agent": 4,
  "Commercial Agent": 3,
  "Marine Agent": 2,
  Company: 1,
}

/**
 * Calculate rule specificity based on how many fields match the booking data
 * Scoring: 0-5 points based on matching fields
 * Safely handles missing or nested objects
 *
 * @param {Object} rule - The rule to evaluate
 * @param {Object} bookingData - The booking data to match against
 * @returns {number} Specificity score (0-5)
 */
function calculateRuleSpecificity(rule, bookingData) {
  let score = 0

  try {
    // 1. Check route match (routeFrom and routeTo)
    if (rule.routes && Array.isArray(rule.routes) && rule.routes.length > 0) {
      const routeMatches = rule.routes.some(
        (route) =>
          String(route.routeFrom) === String(bookingData.routeFrom) &&
          String(route.routeTo) === String(bookingData.routeTo),
      )
      if (routeMatches) score += 1
    }

    // 2. Check cabin match
    if (bookingData.serviceType && rule.serviceDetails) {
      const serviceDetails = rule.serviceDetails[bookingData.serviceType]
      if (serviceDetails && Array.isArray(serviceDetails) && serviceDetails.length > 0) {
        const cabinMatches = serviceDetails.some(
          (detail) => detail.cabinId && String(detail.cabinId) === String(bookingData.cabinId),
        )
        if (cabinMatches) score += 1
      }
    }

    // 3. Check payload type match
    if (bookingData.serviceType && rule.serviceDetails) {
      const serviceDetails = rule.serviceDetails[bookingData.serviceType]
      if (serviceDetails && Array.isArray(serviceDetails) && serviceDetails.length > 0) {
        const payloadMatches = serviceDetails.some(
          (detail) =>
            detail.payloadTypeId && String(detail.payloadTypeId) === String(bookingData.payloadTypeId),
        )
        if (payloadMatches) score += 1
      }
    }

    // 4. Check visa type match
    if (rule.visaType && bookingData.visaType) {
      if (String(rule.visaType).trim() === String(bookingData.visaType).trim()) score += 1
    }

    // 5. Check service type match (passenger/cargo/vehicle)
    if (bookingData.serviceType && rule.serviceDetails) {
      const serviceTypeDetails = rule.serviceDetails[bookingData.serviceType]
      if (serviceTypeDetails && Array.isArray(serviceTypeDetails) && serviceTypeDetails.length > 0) {
        score += 1
      }
    }
  } catch (error) {
    console.error("[ruleSelectionService] Error in calculateRuleSpecificity:", error.message)
    return 0
  }

  return Math.min(score, 5)
}

/**
 * Build MongoDB route filter for efficient querying
 * Uses $elemMatch to filter rules by specific route
 *
 * @param {string} routeFrom - Starting port ID
 * @param {string} routeTo - Ending port ID
 * @returns {Object} MongoDB filter for routes
 */
function buildRouteFilter(routeFrom, routeTo) {
  return {
    routes: {
      $elemMatch: {
        routeFrom: routeFrom,
        routeTo: routeTo,
      },
    },
  }
}

/**
 * Get matching Markup/Discount rules from database
 * Filters in MongoDB for efficiency
 *
 * @param {Object} bookingData - Booking data containing route, cabin, etc.
 * @param {string} ruleType - "Markup" or "Discount"
 * @param {string} companyId - Company ID
 * @returns {Promise<Array>} Sorted array of matching rules (best rule first)
 */
async function getMatchingMarkupDiscountRules(bookingData, ruleType, companyId) {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Build query with route filter at MongoDB level
    const routeFilter = buildRouteFilter(bookingData.routeFrom, bookingData.routeTo)

    const query = {
      company: companyId,
      ruleType: ruleType,
      status: "Active",
      isActive: true,
      isDeleted: false,
      effectiveDate: { $lte: today },
      $or: [{ expiryDate: null }, { expiryDate: { $gte: today } }],
      ...routeFilter,
    }

    // Fetch rules from database
    const rules = await MarkupDiscountRule.find(query).lean()

    if (!Array.isArray(rules) || rules.length === 0) {
      return []
    }

    // Calculate specificity for each rule
    const rulesWithScore = rules.map((rule) => ({
      ...rule,
      specificityScore: calculateRuleSpecificity(rule, bookingData),
    }))

    // Sort by:
    // 1. Specificity score (descending - higher scores first)
    // 2. Priority (ascending - lower priority number first)
    // 3. Layer hierarchy (descending - higher layer values first)
    const sortedRules = rulesWithScore.sort((a, b) => {
      if (a.specificityScore !== b.specificityScore) {
        return b.specificityScore - a.specificityScore
      }
      if (a.priority !== b.priority) {
        return a.priority - b.priority
      }
      const layerA = LAYER_HIERARCHY[a.appliedLayer] || 0
      const layerB = LAYER_HIERARCHY[b.appliedLayer] || 0
      return layerB - layerA
    })

    return sortedRules
  } catch (error) {
    console.error(
      `[ruleSelectionService] Error fetching Markup/Discount rules (${ruleType}):`,
      error.message,
    )
    return []
  }
}

/**
 * Get matching Commission rules from database
 * Filters in MongoDB for efficiency
 *
 * @param {Object} bookingData - Booking data containing route, cabin, etc.
 * @param {string} companyId - Company ID
 * @returns {Promise<Array>} Sorted array of matching rules (best rule first)
 */
async function getMatchingCommissionRules(bookingData, companyId) {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Build query with route filter at MongoDB level
    const routeFilter = buildRouteFilter(bookingData.routeFrom, bookingData.routeTo)

    const query = {
      company: companyId,
      status: "Active",
      isActive: true,
      isDeleted: false,
      effectiveDate: { $lte: today },
      $or: [{ expiryDate: null }, { expiryDate: { $gte: today } }],
      ...routeFilter,
    }

    // Fetch rules from database
    const rules = await CommissionRule.find(query).lean()

    if (!Array.isArray(rules) || rules.length === 0) {
      return []
    }

    // Calculate specificity for each rule
    const rulesWithScore = rules.map((rule) => ({
      ...rule,
      specificityScore: calculateRuleSpecificity(rule, bookingData),
    }))

    // Sort by:
    // 1. Specificity score (descending - higher scores first)
    // 2. Priority (ascending - lower priority number first)
    // 3. Layer hierarchy (descending - higher layer values first)
    const sortedRules = rulesWithScore.sort((a, b) => {
      if (a.specificityScore !== b.specificityScore) {
        return b.specificityScore - a.specificityScore
      }
      if (a.priority !== b.priority) {
        return a.priority - b.priority
      }
      const layerA = LAYER_HIERARCHY[a.appliedLayer] || 0
      const layerB = LAYER_HIERARCHY[b.appliedLayer] || 0
      return layerB - layerA
    })

    return sortedRules
  } catch (error) {
    console.error("[ruleSelectionService] Error fetching Commission rules:", error.message)
    return []
  }
}

/**
 * Apply a Markup or Discount rule to a price
 *
 * @param {number} basePrice - Current price
 * @param {Object} rule - The rule to apply
 * @returns {Object} { appliedPrice, appliedAmount }
 */
function applyMarkupDiscountRule(basePrice, rule) {
  if (!rule) {
    return { appliedPrice: basePrice, appliedAmount: 0 }
  }

  const valueType = rule.valueType || "percentage"
  const ruleValue = rule.ruleValue || 0
  let appliedAmount = 0
  let appliedPrice = basePrice

  if (rule.ruleType === "Markup") {
    if (valueType === "percentage") {
      appliedAmount = (basePrice * ruleValue) / 100
      appliedPrice = basePrice + appliedAmount
    } else if (valueType === "fixed") {
      appliedAmount = ruleValue
      appliedPrice = basePrice + appliedAmount
    }
  } else if (rule.ruleType === "Discount") {
    if (valueType === "percentage") {
      appliedAmount = (basePrice * ruleValue) / 100
      appliedPrice = basePrice - appliedAmount
    } else if (valueType === "fixed") {
      appliedAmount = ruleValue
      appliedPrice = basePrice - appliedAmount
    }
  }

  return {
    appliedPrice: Math.max(0, appliedPrice),
    appliedAmount: appliedAmount,
  }
}

/**
 * Calculate commission based on a Commission rule
 * Commission does NOT change the customer price
 *
 * @param {number} finalPrice - Final customer price
 * @param {Object} rule - The commission rule
 * @returns {Object} { commissionAmount }
 */
function calculateCommission(finalPrice, rule) {
  if (!rule) {
    return { commissionAmount: 0 }
  }

  const commissionType = rule.commissionType || "percentage"
  const commissionValue = rule.commissionValue || 0
  let commissionAmount = 0

  if (commissionType === "percentage") {
    commissionAmount = (finalPrice * commissionValue) / 100
  } else if (commissionType === "fixed") {
    commissionAmount = commissionValue
  }

  return {
    commissionAmount: Math.max(0, commissionAmount),
  }
}

/**
 * Main rule application flow
 * Selects and applies one best rule per type in sequence: Markup → Discount → Commission
 *
 * @param {number} basePrice - Base price before rules
 * @param {Object} bookingData - Booking data (route, cabin, serviceType, etc.)
 * @param {string} companyId - Company ID
 * @returns {Promise<Object>} Final pricing with applied rules
 */
async function applyRules(basePrice, bookingData, companyId) {
  try {
    let currentPrice = basePrice
    const appliedRules = []

    // STEP 1: Select and apply best Markup rule
    const markupRules = await getMatchingMarkupDiscountRules(bookingData, "Markup", companyId)
    const selectedMarkupRule = markupRules.length > 0 ? markupRules[0] : null

    if (selectedMarkupRule) {
      const markupResult = applyMarkupDiscountRule(currentPrice, selectedMarkupRule)
      currentPrice = markupResult.appliedPrice

      appliedRules.push({
        ruleId: selectedMarkupRule._id,
        ruleType: "Markup",
        value: selectedMarkupRule.ruleValue,
      })
    }

    // STEP 2: Select and apply best Discount rule (applied after markup)
    const discountRules = await getMatchingMarkupDiscountRules(bookingData, "Discount", companyId)
    const selectedDiscountRule = discountRules.length > 0 ? discountRules[0] : null

    if (selectedDiscountRule) {
      const discountResult = applyMarkupDiscountRule(currentPrice, selectedDiscountRule)
      currentPrice = discountResult.appliedPrice

      appliedRules.push({
        ruleId: selectedDiscountRule._id,
        ruleType: "Discount",
        value: selectedDiscountRule.ruleValue,
      })
    }

    // STEP 3: Select and calculate best Commission rule (applied to final price, doesn't change price)
    const commissionRules = await getMatchingCommissionRules(bookingData, companyId)
    const selectedCommissionRule = commissionRules.length > 0 ? commissionRules[0] : null

    let commissionAmount = 0
    if (selectedCommissionRule) {
      const commissionResult = calculateCommission(currentPrice, selectedCommissionRule)
      commissionAmount = commissionResult.commissionAmount
      // NOTE: currentPrice does NOT change - commission is calculated separately

      appliedRules.push({
        ruleId: selectedCommissionRule._id,
        ruleType: "Commission",
        value: selectedCommissionRule.commissionValue,
      })
    }

    return {
      basePrice: basePrice,
      finalPrice: currentPrice,
      commissionAmount: commissionAmount,
      appliedRules: appliedRules,
    }
  } catch (error) {
    console.error("[ruleSelectionService] Error in applyRules:", error.message)
    // Return base price unchanged on error
    return {
      basePrice: basePrice,
      finalPrice: basePrice,
      commissionAmount: 0,
      appliedRules: [],
    }
  }
}

module.exports = {
  calculateRuleSpecificity,
  getMatchingMarkupDiscountRules,
  getMatchingCommissionRules,
  applyMarkupDiscountRule,
  calculateCommission,
  applyRules,
}
