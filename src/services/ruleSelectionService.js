const { MarkupDiscountRule } = require("../models/MarkupDiscountRule")
const { CommissionRule } = require("../models/CommissionRule")

/**
 * Layer hierarchy mapping - Partner layers from specific to general
 * Higher value = higher precedence (more specific)
 * Used for sorting: higher values come first
 * 
 * Hierarchy: Selling Agent (4) → Commercial Agent (3) → Marine Agent (2) → Company (1)
 */
const LAYER_HIERARCHY = {
  "Selling Agent": 4,
  "Commercial Agent": 3,
  "Marine Agent": 2,
  Company: 1,
}

/**
 * Get all partner layers for a given partner and company
 * This builds the partner hierarchy to apply rules at different layers
 * 
 * @param {string} partnerId - Partner ID (can be null for company-level)
 * @param {Object} partnerModel - Partner model reference
 * @returns {Promise<Array>} Array of { partnerId, layer } objects in hierarchy order
 */
async function getPartnerHierarchy(partnerId, partnerModel) {
  if (!partnerId) {
    // Company-level rules only
    return [{ partnerId: null, layer: "Company" }]
  }

  try {
    const hierarchy = []
    let currentPartnerId = partnerId

    // Walk up the partner hierarchy
    while (currentPartnerId) {
      const partner = await partnerModel.findById(currentPartnerId).lean()
      if (!partner) break

      // Map partner layer to rule layer
      const layerMap = {
        Selling: "Selling Agent",
        Commercial: "Commercial Agent",
        Marine: "Marine Agent",
      }
      const ruleLayer = layerMap[partner.layer] || partner.layer

      hierarchy.push({
        partnerId: currentPartnerId.toString(),
        layer: ruleLayer,
      })

      // Move to parent partner
      currentPartnerId = partner.parentAccount ? partner.parentAccount.toString() : null
    }

    // Add company level at the end (most general)
    hierarchy.push({ partnerId: null, layer: "Company" })

    return hierarchy
  } catch (error) {
    console.error("[ruleSelectionService] Error building partner hierarchy:", error.message)
    // Fallback to just company level
    return [{ partnerId: null, layer: "Company" }]
  }
}

/**
 * Calculate rule specificity based on how many fields match the booking data
 * Scoring: 0-5 points based on matching fields
 * Rules without route filters naturally have lower specificity (no route match point)
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
    // Global rules (no route filter) naturally get 0 points for route match

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
 * Filter rules by partner hierarchy and partner scope logic
 * Applies AllChildPartners scope: rules at parent layers apply to all descendant partners
 *
 * @param {Array} rules - All rules fetched from database
 * @param {Array} partnerHierarchy - Array of { partnerId, layer } objects representing booking's partner hierarchy
 * @returns {Array} Filtered rules that match partner hierarchy
 */
function filterRulesByPartnerHierarchy(rules, partnerHierarchy) {
  if (!Array.isArray(rules) || rules.length === 0) {
    return []
  }

  const bookingPartnerIds = partnerHierarchy.map((h) => h.partnerId).filter(Boolean) // Exclude null (Company)

  return rules.filter((rule) => {
    // Company-level rules apply to all bookings
    if (!rule.partner) {
      return true
    }

    const rulePartner = String(rule.partner)

    // SpecificPartner scope (default): rule applies only to exact partner match
    if (!rule.partnerScope || rule.partnerScope === "SpecificPartner") {
      return bookingPartnerIds.includes(rulePartner)
    }

    // AllChildPartners scope: rule applies to all descendants in hierarchy
    // Rule partner must be an ancestor (or the partner itself) in the booking's hierarchy
    if (rule.partnerScope === "AllChildPartners") {
      // Check if rule partner is in the hierarchy - it's an ancestor if it appears in the chain
      // The booking's partner hierarchy is ordered from specific (child) to general (parent)
      // So if the rule partner is anywhere in the hierarchy, it's an ancestor or the partner itself
      return bookingPartnerIds.includes(rulePartner)
    }

    return false
  })
}

/**
 * Filter rules by booking data (route, cabin, etc.)
 * Applied in application logic instead of MongoDB for simpler queries
 *
 * @param {Array} rules - Rules to filter
 * @param {Object} bookingData - Booking data with route, cabin, serviceType, etc.
 * @returns {Array} Filtered rules matching booking criteria
 */
function filterRulesByBookingData(rules, bookingData) {
  if (!Array.isArray(rules) || rules.length === 0) {
    return []
  }

  return rules.filter((rule) => {
    // Check route match (or allow global rules with no routes)
    if (rule.routes && Array.isArray(rule.routes) && rule.routes.length > 0) {
      const routeMatches = rule.routes.some(
        (route) =>
          String(route.routeFrom) === String(bookingData.routeFrom) &&
          String(route.routeTo) === String(bookingData.routeTo),
      )
      if (!routeMatches) return false
    }
    // If routes array is empty or missing, rule is global and applies

    // Check service type match only if rule has serviceDetails AND booking has serviceType
    if (rule.serviceDetails && bookingData.serviceType && rule.serviceDetails[bookingData.serviceType]) {
      const serviceDetails = rule.serviceDetails[bookingData.serviceType]
      if (!Array.isArray(serviceDetails) || serviceDetails.length === 0) {
        return false // Rule defines service details but doesn't cover booking's service type
      }
    }
    // Rules without serviceDetails are global to all service types
    // Rules with serviceDetails but booking missing serviceType still apply

    return true
  })
}

/**
 * Get matching Markup/Discount rules from database
 * Uses simplified base query, applies filtering in application logic
 * Supports partner hierarchy with AllChildPartners scope
 *
 * @param {Object} bookingData - Booking data containing route, cabin, partnerId, etc.
 * @param {string} ruleType - "Markup" or "Discount"
 * @param {string} companyId - Company ID
 * @param {Array} partnerHierarchy - Array of { partnerId, layer } objects from getPartnerHierarchy()
 * @returns {Promise<Array>} Sorted array of matching rules (best rule first)
 */
async function getMatchingMarkupDiscountRules(bookingData, ruleType, companyId, partnerHierarchy = []) {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // If no partner hierarchy provided, default to company level
    if (!Array.isArray(partnerHierarchy) || partnerHierarchy.length === 0) {
      partnerHierarchy = [{ partnerId: null, layer: "Company" }]
    }

    // Simple base query - let application logic handle filtering
    const query = {
      company: companyId,
      ruleType: ruleType,
      status: "Active",
      isActive: true,
      isDeleted: false,
      effectiveDate: { $lte: today },
      $or: [{ expiryDate: null }, { expiryDate: { $gte: today } }],
    }

    // Fetch all rules matching basic criteria
    const allRules = await MarkupDiscountRule.find(query).lean()

    if (!Array.isArray(allRules) || allRules.length === 0) {
      return []
    }

    // Apply partner hierarchy filtering (handles SpecificPartner and AllChildPartners scopes)
    let filteredRules = filterRulesByPartnerHierarchy(allRules, partnerHierarchy)

    // Apply booking data filtering (route, service type)
    filteredRules = filterRulesByBookingData(filteredRules, bookingData)

    // Filter by applicable layers from hierarchy
    const applicableLayers = partnerHierarchy.map((h) => h.layer)
    filteredRules = filteredRules.filter((rule) => applicableLayers.includes(rule.appliedLayer))

    if (filteredRules.length === 0) {
      return []
    }

    // Calculate specificity for each rule
    const rulesWithScore = filteredRules.map((rule) => ({
      ...rule,
      specificityScore: calculateRuleSpecificity(rule, bookingData),
    }))

    // Sort by:
    // 1. Specificity score (descending - higher scores first)
    // 2. Priority (ascending - lower priority number first = higher priority)
    // 3. Layer hierarchy (descending - higher layer values first = more specific partner layer)
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
 * Uses simplified base query, applies filtering in application logic
 * Supports partner hierarchy with AllChildPartners scope
 *
 * @param {Object} bookingData - Booking data containing route, cabin, partnerId, etc.
 * @param {string} companyId - Company ID
 * @param {Array} partnerHierarchy - Array of { partnerId, layer } objects from getPartnerHierarchy()
 * @returns {Promise<Array>} Sorted array of matching rules (best rule first)
 */
async function getMatchingCommissionRules(bookingData, companyId, partnerHierarchy = []) {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // If no partner hierarchy provided, default to company level
    if (!Array.isArray(partnerHierarchy) || partnerHierarchy.length === 0) {
      partnerHierarchy = [{ partnerId: null, layer: "Company" }]
    }

    // Simple base query - let application logic handle filtering
    const query = {
      company: companyId,
      status: "Active",
      isActive: true,
      isDeleted: false,
      effectiveDate: { $lte: today },
      $or: [{ expiryDate: null }, { expiryDate: { $gte: today } }],
    }

    // Fetch all rules matching basic criteria
    const allRules = await CommissionRule.find(query).lean()

    if (!Array.isArray(allRules) || allRules.length === 0) {
      return []
    }

    // Apply partner hierarchy filtering (handles SpecificPartner and AllChildPartners scopes)
    let filteredRules = filterRulesByPartnerHierarchy(allRules, partnerHierarchy)

    // Apply booking data filtering (route, service type)
    filteredRules = filterRulesByBookingData(filteredRules, bookingData)

    // Filter by applicable layers from hierarchy
    const applicableLayers = partnerHierarchy.map((h) => h.layer)
    filteredRules = filteredRules.filter((rule) => applicableLayers.includes(rule.appliedLayer))

    if (filteredRules.length === 0) {
      return []
    }

    // Calculate specificity for each rule
    const rulesWithScore = filteredRules.map((rule) => ({
      ...rule,
      specificityScore: calculateRuleSpecificity(rule, bookingData),
    }))

    // Sort by:
    // 1. Specificity score (descending - higher scores first)
    // 2. Priority (ascending - lower priority number first = higher priority)
    // 3. Layer hierarchy (descending - higher layer values first = more specific partner layer)
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
 * Standardized to use valueType and ruleValue fields consistently
 *
 * @param {number} basePrice - Current price
 * @param {Object} rule - The rule to apply
 * @returns {Object} { appliedPrice, appliedAmount }
 */
function applyMarkupDiscountRule(basePrice, rule) {
  if (!rule) {
    return { appliedPrice: basePrice, appliedAmount: 0 }
  }

  // Standardized field access: use valueType and ruleValue consistently
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
 * Standardized to use commissionType and commissionValue fields
 * Commission does NOT change the customer price - it's calculated separately
 *
 * @param {number} finalPrice - Final customer price
 * @param {Object} rule - The commission rule
 * @returns {Object} { commissionAmount }
 */
function calculateCommission(finalPrice, rule) {
  if (!rule) {
    return { commissionAmount: 0 }
  }

  // Standardized field access: use commissionType and commissionValue consistently
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
 * Main rule application flow with partner hierarchy support
 * Selects and applies one best rule per type in sequence: Markup �� Discount → Commission
 * Respects partner layer hierarchy: Selling Agent → Commercial Agent → Marine Agent → Company
 *
 * @param {number} basePrice - Base price before rules
 * @param {Object} bookingData - Booking data (route, cabin, serviceType, partnerId, etc.)
 * @param {string} companyId - Company ID
 * @param {Object} partnerModel - Partner model reference (required for partner hierarchy lookup)
 * @returns {Promise<Object>} Final pricing with applied rules and detailed tracking
 */
async function applyRules(basePrice, bookingData, companyId, partnerModel) {
  try {
    let currentPrice = basePrice
    const appliedRules = []

    // Build partner hierarchy if partner ID provided
    let partnerHierarchy = [{ partnerId: null, layer: "Company" }]
    if (bookingData.partnerId && partnerModel) {
      partnerHierarchy = await getPartnerHierarchy(bookingData.partnerId, partnerModel)
    }

    // STEP 1: Select and apply best Markup rule
    const markupRules = await getMatchingMarkupDiscountRules(
      bookingData,
      "Markup",
      companyId,
      partnerHierarchy,
    )
    const selectedMarkupRule = markupRules.length > 0 ? markupRules[0] : null

    if (selectedMarkupRule) {
      const markupResult = applyMarkupDiscountRule(currentPrice, selectedMarkupRule)
      currentPrice = markupResult.appliedPrice

      appliedRules.push({
        ruleId: selectedMarkupRule._id,
        ruleType: "Markup",
        priority: selectedMarkupRule.priority || 1,
        appliedLayer: selectedMarkupRule.appliedLayer,
        specificityScore: selectedMarkupRule.specificityScore,
        ruleValue: selectedMarkupRule.ruleValue,
        valueType: selectedMarkupRule.valueType || "percentage",
        appliedAmount: markupResult.appliedAmount,
      })
    }

    // STEP 2: Select and apply best Discount rule (applied after markup)
    const discountRules = await getMatchingMarkupDiscountRules(
      bookingData,
      "Discount",
      companyId,
      partnerHierarchy,
    )
    const selectedDiscountRule = discountRules.length > 0 ? discountRules[0] : null

    if (selectedDiscountRule) {
      const discountResult = applyMarkupDiscountRule(currentPrice, selectedDiscountRule)
      currentPrice = discountResult.appliedPrice

      appliedRules.push({
        ruleId: selectedDiscountRule._id,
        ruleType: "Discount",
        priority: selectedDiscountRule.priority || 1,
        appliedLayer: selectedDiscountRule.appliedLayer,
        specificityScore: selectedDiscountRule.specificityScore,
        ruleValue: selectedDiscountRule.ruleValue,
        valueType: selectedDiscountRule.valueType || "percentage",
        appliedAmount: discountResult.appliedAmount,
      })
    }

    // STEP 3: Select and calculate best Commission rule (applied to final price, doesn't change price)
    const commissionRules = await getMatchingCommissionRules(
      bookingData,
      companyId,
      partnerHierarchy,
    )
    const selectedCommissionRule = commissionRules.length > 0 ? commissionRules[0] : null

    let commissionAmount = 0
    if (selectedCommissionRule) {
      const commissionResult = calculateCommission(currentPrice, selectedCommissionRule)
      commissionAmount = commissionResult.commissionAmount
      // NOTE: currentPrice does NOT change - commission is calculated separately

      appliedRules.push({
        ruleId: selectedCommissionRule._id,
        ruleType: "Commission",
        priority: selectedCommissionRule.priority || 1,
        appliedLayer: selectedCommissionRule.appliedLayer,
        specificityScore: selectedCommissionRule.specificityScore,
        ruleValue: selectedCommissionRule.commissionValue,
        valueType: selectedCommissionRule.commissionType || "percentage",
        appliedAmount: commissionAmount,
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
  LAYER_HIERARCHY,
  getPartnerHierarchy,
  calculateRuleSpecificity,
  filterRulesByPartnerHierarchy,
  filterRulesByBookingData,
  getMatchingMarkupDiscountRules,
  getMatchingCommissionRules,
  buildRouteFilter,
  applyMarkupDiscountRule,
  calculateCommission,
  applyRules,
}
