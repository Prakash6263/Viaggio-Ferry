const mongoose = require("mongoose")
const { MarkupDiscountRule } = require("../models/MarkupDiscountRule")
const { CommissionRule } = require("../models/CommissionRule")

/**
 * Maps partner layer to the appliedLayer enum values used in rules
 * Partner.layer: "Marine" | "Commercial" | "Selling"
 * Rule appliedLayer: "Company" | "Marine Agent" | "Commercial Agent" | "Selling Agent"
 */
const partnerLayerToAppliedLayer = (layer) => {
  const map = {
    Marine: "Marine Agent",
    Commercial: "Commercial Agent",
    Selling: "Selling Agent",
  }
  return map[layer] || null
}

/**
 * Build the base filter for fetching active, non-expired rules
 */
const buildBaseRuleFilter = (companyId, searchDate) => ({
  company: new mongoose.Types.ObjectId(companyId),
  isActive: true,
  isDeleted: false,
  status: "Active",
  effectiveDate: { $lte: new Date(searchDate) },
  $or: [{ expiryDate: null }, { expiryDate: { $gte: new Date(searchDate) } }],
})

/**
 * Check if a rule matches the given route (origin → destination)
 * Rules with empty routes array = applies to ALL routes
 * Rules with routes = must match at least one route entry
 */
const ruleMatchesRoute = (rule, originPortId, destinationPortId) => {
  if (!rule.routes || rule.routes.length === 0) {
    // Empty routes = applies to all routes
    return true
  }
  return rule.routes.some(
    (r) =>
      r.routeFrom?.toString() === originPortId.toString() &&
      r.routeTo?.toString() === destinationPortId.toString()
  )
}

/**
 * Check if a rule matches the given service details (category + cabinId + payloadTypeId)
 * Rules with empty serviceDetails[category] = applies to all payload types / cabins
 * Rules with entries = must match at least one entry
 */
const ruleMatchesServiceDetail = (rule, category, cabinId, payloadTypeId) => {
  const details = rule.serviceDetails?.[category]
  if (!details || details.length === 0) {
    // Empty = applies to all
    return true
  }
  return details.some((d) => {
    const cabinMatch = !d.cabinId || d.cabinId.toString() === cabinId.toString()
    const payloadMatch = !d.payloadTypeId || d.payloadTypeId.toString() === payloadTypeId.toString()
    return cabinMatch && payloadMatch
  })
}

/**
 * Check if a rule matches the given partner
 * partnerScope = "AllChildPartners" → applies to all child partners of the provider
 * partnerScope = "SpecificPartner" → applies only to rule.partner
 * No partnerScope (null) → applies to everyone at that layer
 */
const ruleMatchesPartner = (rule, partnerId) => {
  if (!rule.partnerScope) {
    // No scope restriction - applies to all
    return true
  }
  if (rule.partnerScope === "AllChildPartners") {
    // Applies to all partners (we already filter by layer/provider above)
    return true
  }
  if (rule.partnerScope === "SpecificPartner") {
    return rule.partner?.toString() === partnerId?.toString()
  }
  return false
}

/**
 * Apply a single rule value (markup, discount, or commission) to a base price
 */
const applyRuleValue = (basePrice, valueType, value, ruleType) => {
  if (value === null || value === undefined) return 0

  if (valueType === "percentage") {
    return Math.round(basePrice * (value / 100) * 100) / 100
  } else if (valueType === "fixed") {
    return value
  }
  return 0
}

/**
 * Fetch and match the best MarkupDiscountRule for a given context
 * Returns the single highest-priority matching rule (sorted by priority DESC, effectiveDate DESC)
 */
const findBestMarkupDiscountRule = async ({
  companyId,
  userType,       // "company" | "partner"
  partnerId,      // Partner ObjectId (if partner user)
  partnerLayer,   // "Marine" | "Commercial" | "Selling" (from Partner.layer)
  category,       // "passenger" | "vehicle" | "cargo"
  originPortId,
  destinationPortId,
  cabinId,
  payloadTypeId,
  visaType,
  searchDate,
}) => {
  const baseFilter = buildBaseRuleFilter(companyId, searchDate)

  // Fetch all potentially matching rules
  // We filter broadly and then refine in JS for complex array matching
  const rules = await MarkupDiscountRule.find(baseFilter)
    .sort({ priority: -1, effectiveDate: -1 })
    .lean()

  const appliedLayerForPartner = partnerLayer ? partnerLayerToAppliedLayer(partnerLayer) : null

  // Filter rules that match our context
  const matchingRules = rules.filter((rule) => {
    // Must match route (or be all-routes)
    if (!ruleMatchesRoute(rule, originPortId, destinationPortId)) return false

    // Must match service detail (cabin + payloadType)
    if (!ruleMatchesServiceDetail(rule, category, cabinId, payloadTypeId)) return false

    // Must match visa type (if rule has one)
    if (rule.visaType && rule.visaType !== visaType) return false

    // Layer matching:
    // - Company user: only apply rules where appliedLayer = "Company"
    // - Partner user: apply rules where appliedLayer matches partner's layer
    if (userType === "company") {
      if (rule.appliedLayer !== "Company") return false
      // For company-applied rules, partner scope must match the viewing user
      // Company user sees Company-level rules only
    } else if (userType === "partner") {
      if (rule.appliedLayer !== appliedLayerForPartner) return false
      // Check partner scope
      if (!ruleMatchesPartner(rule, partnerId)) return false
    }

    return true
  })

  return matchingRules.length > 0 ? matchingRules[0] : null
}

/**
 * Fetch and match the best CommissionRule for a given context
 */
const findBestCommissionRule = async ({
  companyId,
  userType,
  partnerId,
  partnerLayer,
  category,
  originPortId,
  destinationPortId,
  cabinId,
  payloadTypeId,
  visaType,
  searchDate,
}) => {
  const baseFilter = buildBaseRuleFilter(companyId, searchDate)

  const rules = await CommissionRule.find(baseFilter)
    .sort({ priority: -1, effectiveDate: -1 })
    .lean()

  const appliedLayerForPartner = partnerLayer ? partnerLayerToAppliedLayer(partnerLayer) : null

  const matchingRules = rules.filter((rule) => {
    if (!ruleMatchesRoute(rule, originPortId, destinationPortId)) return false
    if (!ruleMatchesServiceDetail(rule, category, cabinId, payloadTypeId)) return false
    if (rule.visaType && rule.visaType !== visaType) return false

    if (userType === "company") {
      if (rule.appliedLayer !== "Company") return false
    } else if (userType === "partner") {
      if (rule.appliedLayer !== appliedLayerForPartner) return false
      if (!ruleMatchesPartner(rule, partnerId)) return false
    }

    return true
  })

  return matchingRules.length > 0 ? matchingRules[0] : null
}

/**
 * Apply markup/discount + commission rules to a base unit price
 *
 * Price calculation order:
 * 1. Start with basePrice (from PriceListDetail)
 * 2. Apply Markup → displayPrice = basePrice + markupAmount
 * 3. Apply Discount → displayPrice = displayPrice - discountAmount (discount applied after markup)
 * 4. Commission is calculated on displayPrice (not added to customer price, it's the agent's earning)
 *
 * Returns enriched pricing object with:
 * - adjustedUnitPrice: final price shown to the user (after markup/discount)
 * - adjustedSubtotal: adjustedUnitPrice * quantity
 * - markupAmount: per-unit markup applied
 * - discountAmount: per-unit discount applied
 * - commissionAmount: per-unit commission earned (agent)
 * - netPrice: adjustedUnitPrice - commissionAmount (what company receives)
 * - rules applied: markup rule name, discount rule name, commission rule name
 */
const applyPricingRules = async ({
  companyId,
  userType,
  partnerId,
  partnerLayer,
  category,
  originPortId,
  destinationPortId,
  cabinId,
  payloadTypeId,
  visaType,
  searchDate,
  baseUnitPrice,  // unitPrice from PriceListDetail (basicPrice)
  unitTotalPrice, // totalPrice from PriceListDetail (basicPrice + taxes)
  quantity,
}) => {
  // Fetch best matching markup rule
  const markupRule = await findBestMarkupDiscountRule({
    companyId,
    userType,
    partnerId,
    partnerLayer,
    category,
    originPortId,
    destinationPortId,
    cabinId,
    payloadTypeId,
    visaType,
    searchDate,
  })

  // Fetch best matching commission rule
  const commissionRule = await findBestCommissionRule({
    companyId,
    userType,
    partnerId,
    partnerLayer,
    category,
    originPortId,
    destinationPortId,
    cabinId,
    payloadTypeId,
    visaType,
    searchDate,
  })

  let adjustedUnitPrice = unitTotalPrice // start with full price including taxes
  let markupAmount = 0
  let discountAmount = 0
  let commissionAmount = 0
  let appliedMarkupRule = null
  let appliedDiscountRule = null
  let appliedCommissionRule = null

  // Step 1: Apply Markup (if rule found and ruleType = "Markup")
  if (markupRule && markupRule.ruleType === "Markup") {
    markupAmount = applyRuleValue(unitTotalPrice, markupRule.valueType, markupRule.ruleValue, "Markup")
    adjustedUnitPrice = Math.round((adjustedUnitPrice + markupAmount) * 100) / 100
    appliedMarkupRule = {
      _id: markupRule._id,
      ruleName: markupRule.ruleName,
      ruleType: markupRule.ruleType,
      valueType: markupRule.valueType,
      ruleValue: markupRule.ruleValue,
      amountApplied: markupAmount,
    }
  }

  // Step 2: Apply Discount (if rule found and ruleType = "Discount")
  // Re-fetch to specifically find a discount rule (above fetches highest priority which could be markup OR discount)
  const discountRule = await findBestMarkupDiscountRuleByType({
    companyId,
    userType,
    partnerId,
    partnerLayer,
    category,
    originPortId,
    destinationPortId,
    cabinId,
    payloadTypeId,
    visaType,
    searchDate,
    filterRuleType: "Discount",
  })

  if (discountRule) {
    discountAmount = applyRuleValue(adjustedUnitPrice, discountRule.valueType, discountRule.ruleValue, "Discount")
    adjustedUnitPrice = Math.round((adjustedUnitPrice - discountAmount) * 100) / 100
    // Ensure price doesn't go below 0
    adjustedUnitPrice = Math.max(0, adjustedUnitPrice)
    appliedDiscountRule = {
      _id: discountRule._id,
      ruleName: discountRule.ruleName,
      ruleType: discountRule.ruleType,
      valueType: discountRule.valueType,
      ruleValue: discountRule.ruleValue,
      amountApplied: discountAmount,
    }
  }

  // Re-fetch markup specifically (in case above found discount first)
  const markupRuleSpecific = await findBestMarkupDiscountRuleByType({
    companyId,
    userType,
    partnerId,
    partnerLayer,
    category,
    originPortId,
    destinationPortId,
    cabinId,
    payloadTypeId,
    visaType,
    searchDate,
    filterRuleType: "Markup",
  })

  // Only use specific markup if not already applied
  if (!appliedMarkupRule && markupRuleSpecific) {
    markupAmount = applyRuleValue(unitTotalPrice, markupRuleSpecific.valueType, markupRuleSpecific.ruleValue, "Markup")
    adjustedUnitPrice = Math.round((unitTotalPrice + markupAmount - discountAmount) * 100) / 100
    adjustedUnitPrice = Math.max(0, adjustedUnitPrice)
    appliedMarkupRule = {
      _id: markupRuleSpecific._id,
      ruleName: markupRuleSpecific.ruleName,
      ruleType: markupRuleSpecific.ruleType,
      valueType: markupRuleSpecific.valueType,
      ruleValue: markupRuleSpecific.ruleValue,
      amountApplied: markupAmount,
    }
  }

  // Step 3: Apply Commission (calculated on adjustedUnitPrice)
  if (commissionRule) {
    commissionAmount = applyRuleValue(adjustedUnitPrice, commissionRule.commissionType, commissionRule.commissionValue, "Commission")
    appliedCommissionRule = {
      _id: commissionRule._id,
      ruleName: commissionRule.ruleName,
      commissionType: commissionRule.commissionType,
      commissionValue: commissionRule.commissionValue,
      amountApplied: commissionAmount,
    }
  }

  // Net price = what company receives = adjusted price - commission
  const netUnitPrice = Math.round((adjustedUnitPrice - commissionAmount) * 100) / 100

  // Per-unit price adjustment
  const unitPriceAdjustment = Math.round((adjustedUnitPrice - unitTotalPrice) * 100) / 100

  // Subtotals
  const adjustedSubtotal = Math.round(adjustedUnitPrice * quantity * 100) / 100
  const originalSubtotal = Math.round(unitTotalPrice * quantity * 100) / 100
  const markupSubtotal = Math.round(markupAmount * quantity * 100) / 100
  const discountSubtotal = Math.round(discountAmount * quantity * 100) / 100
  const commissionSubtotal = Math.round(commissionAmount * quantity * 100) / 100
  const netSubtotal = Math.round(netUnitPrice * quantity * 100) / 100

  return {
    // Prices
    originalUnitPrice: unitTotalPrice,
    adjustedUnitPrice,
    netUnitPrice,

    // Per-unit adjustments
    markupAmount,
    discountAmount,
    commissionAmount,
    unitPriceAdjustment,

    // Subtotals (× quantity)
    originalSubtotal,
    adjustedSubtotal,
    markupSubtotal,
    discountSubtotal,
    commissionSubtotal,
    netSubtotal,

    // Applied rules (null if no rule matched)
    appliedMarkupRule,
    appliedDiscountRule,
    appliedCommissionRule,

    // Flags
    hasMarkup: !!appliedMarkupRule,
    hasDiscount: !!appliedDiscountRule,
    hasCommission: !!appliedCommissionRule,
  }
}

/**
 * Helper: Find best rule filtered by a specific ruleType ("Markup" or "Discount")
 */
const findBestMarkupDiscountRuleByType = async ({
  companyId,
  userType,
  partnerId,
  partnerLayer,
  category,
  originPortId,
  destinationPortId,
  cabinId,
  payloadTypeId,
  visaType,
  searchDate,
  filterRuleType, // "Markup" or "Discount"
}) => {
  const baseFilter = {
    ...buildBaseRuleFilter(companyId, searchDate),
    ruleType: filterRuleType,
  }

  const rules = await MarkupDiscountRule.find(baseFilter)
    .sort({ priority: -1, effectiveDate: -1 })
    .lean()

  const appliedLayerForPartner = partnerLayer ? partnerLayerToAppliedLayer(partnerLayer) : null

  const matchingRules = rules.filter((rule) => {
    if (!ruleMatchesRoute(rule, originPortId, destinationPortId)) return false
    if (!ruleMatchesServiceDetail(rule, category, cabinId, payloadTypeId)) return false
    if (rule.visaType && rule.visaType !== visaType) return false

    if (userType === "company") {
      if (rule.appliedLayer !== "Company") return false
    } else if (userType === "partner") {
      if (rule.appliedLayer !== appliedLayerForPartner) return false
      if (!ruleMatchesPartner(rule, partnerId)) return false
    }

    return true
  })

  return matchingRules.length > 0 ? matchingRules[0] : null
}

module.exports = {
  applyPricingRules,
  findBestMarkupDiscountRule,
  findBestCommissionRule,
  partnerLayerToAppliedLayer,
}
