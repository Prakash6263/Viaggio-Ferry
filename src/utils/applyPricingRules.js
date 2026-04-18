const mongoose = require("mongoose")
const { MarkupDiscountRule } = require("../models/MarkupDiscountRule")
const { CommissionRule } = require("../models/CommissionRule")

// ─── Helpers ─────────────────────────────────────────────────────────────────

function round2(val) {
  return Math.round((val || 0) * 100) / 100
}

/**
 * STEP 1 — Mandatory field matching.
 *
 * A rule only qualifies if ALL fields it explicitly defines match the booking context.
 * Fields the rule leaves undefined/empty are ignored (the rule is general for that field).
 *
 * Rules:
 *   - routes defined (length > 0)        → booking route MUST match one entry (either direction)
 *   - serviceDetails[category] defined   → at least one entry's cabin+payloadType MUST match
 *   - visaType defined (non-null)         → booking visaType MUST match
 *
 * Within a serviceDetails entry, if cabinId or payloadTypeId is null → that sub-field is general.
 */
function ruleMatchesBooking(rule, ctx) {
  // ── 1. Route: if rule defines routes, booking route must match ──────────────
  if (rule.routes && rule.routes.length > 0) {
    const hasRouteMatch = rule.routes.some(
      (r) =>
        (String(r.routeFrom) === String(ctx.originPort) &&
          String(r.routeTo) === String(ctx.destinationPort)) ||
        (String(r.routeFrom) === String(ctx.destinationPort) &&
          String(r.routeTo) === String(ctx.originPort))
    )
    if (!hasRouteMatch) return false
  }

  // ── 2. Service details: if rule defines entries for this category, at least one must match ──
  const serviceDetails = rule.serviceDetails?.[ctx.category]
  if (serviceDetails && serviceDetails.length > 0) {
    const hasServiceMatch = serviceDetails.some((detail) => {
      // Sub-field null → general (matches anything); defined → must equal booking value
      const cabinOk = !detail.cabinId || String(detail.cabinId) === String(ctx.cabinId)
      const payloadOk =
        !detail.payloadTypeId || String(detail.payloadTypeId) === String(ctx.payloadTypeId)
      return cabinOk && payloadOk
    })
    if (!hasServiceMatch) return false
  }

  // ── 3. VisaType: if rule defines a visa type → booking must have that exact visa type ──
  if (rule.visaType) {
    if (!ctx.visaType || rule.visaType.trim() !== ctx.visaType.trim()) return false
  }

  return true
}

/**
 * STEP 2 — Specificity score (for tiebreaking when priorities are equal).
 *
 * Count how many fields the rule explicitly defines (and matches).
 * Higher score = more specific rule = preferred over general rules.
 * Max score: 5  (route + serviceDetails + cabin + payloadType + visaType)
 */
function getRuleSpecificity(rule, ctx) {
  let score = 0

  // Route specifically defined
  if (rule.routes && rule.routes.length > 0) score += 1

  // Service details specifically defined for this category
  const details = rule.serviceDetails?.[ctx.category]
  if (details && details.length > 0) {
    score += 1 // has service details at all

    // Cabin specifically defined and matched
    if (ctx.cabinId && details.some((d) => d.cabinId && String(d.cabinId) === String(ctx.cabinId))) {
      score += 1
    }

    // PayloadType specifically defined and matched
    if (
      ctx.payloadTypeId &&
      details.some((d) => d.payloadTypeId && String(d.payloadTypeId) === String(ctx.payloadTypeId))
    ) {
      score += 1
    }
  }

  // VisaType specifically defined
  if (rule.visaType) score += 1

  return score
}

/**
 * STEP 3 — Select best rule from a set of candidates.
 *
 * Algorithm:
 *   1. Filter: discard rules where any defined field does NOT match (mandatory matching)
 *   2. Sort by priority DESC  → higher priority number = higher priority = selected first
 *   3. Tiebreak by specificity DESC → more specifically defined fields wins
 *   4. Return the first (best) rule, or null if none qualify
 */
function selectBestRule(rules, ctx) {
  if (!rules || rules.length === 0) return null

  // Step 1: mandatory field matching — only keep rules where ALL defined fields match
  const qualifying = rules.filter((r) => ruleMatchesBooking(r, ctx))

  if (qualifying.length === 0) return null
  if (qualifying.length === 1) return qualifying[0]

  // Step 2 & 3: sort — highest priority first, then highest specificity as tiebreaker
  return qualifying
    .map((r) => ({ ...r, _spec: getRuleSpecificity(r, ctx) }))
    .sort((a, b) => {
      if (a.priority !== b.priority) return b.priority - a.priority // higher priority# wins
      return b._spec - a._spec // more specific rules wins on tie
    })[0]
}

/**
 * Apply a Markup or Discount rule to a price.
 * Returns { newPrice, delta } where delta is positive for markup, negative for discount.
 */
function applyMarkupDiscount(price, rule) {
  if (!rule) return { newPrice: price, delta: 0 }

  const vt = rule.valueType || "percentage"
  const rv = rule.ruleValue || 0
  let delta = 0

  if (rule.ruleType === "Markup") {
    delta = vt === "percentage" ? (price * rv) / 100 : rv
  } else if (rule.ruleType === "Discount") {
    delta = vt === "percentage" ? -((price * rv) / 100) : -rv
  }

  return { newPrice: Math.max(0, price + delta), delta }
}

/**
 * Calculate commission amount (separate from price — does NOT change final price).
 */
function calcCommission(price, rule) {
  if (!rule) return 0
  const ct = rule.commissionType || "percentage"
  const cv = rule.commissionValue || 0
  if (ct === "percentage") return (price * cv) / 100
  if (ct === "fixed") return cv
  return 0
}

// ─── DB Fetchers ──────────────────────────────────────────────────────────────

/**
 * Fetch MarkupDiscountRule records for a given layer.
 * - Company layer:  no partner filter
 * - Marine/Commercial: filter by partnerIds using AllChildPartners OR SpecificPartner scope
 */
async function fetchMDRules({ companyId, appliedLayer, providerType, providerPartner, providerPartners, partnerIds, today }) {
  const andConditions = [
    { company: new mongoose.Types.ObjectId(companyId) },
    { appliedLayer },
    { status: "Active" },
    { isActive: true },
    { isDeleted: false },
    { effectiveDate: { $lte: today } },
    { $or: [{ expiryDate: null }, { expiryDate: { $gte: today } }] },
  ]

  if (providerType) andConditions.push({ providerType })
  if (providerPartner) {
    andConditions.push({ providerPartner: new mongoose.Types.ObjectId(providerPartner) })
  } else if (providerPartners && providerPartners.length > 0) {
    andConditions.push({
      providerPartner: { $in: providerPartners.map(id => new mongoose.Types.ObjectId(id)) }
    })
  }

  if (partnerIds && partnerIds.length > 0) {
    const oids = partnerIds.map((id) => new mongoose.Types.ObjectId(id))
    andConditions.push({
      $or: [
        { partnerScope: "AllChildPartners" },
        { partnerScope: "SpecificPartner", partner: { $in: oids } },
      ],
    })
  }

  return MarkupDiscountRule.find({ $and: andConditions }).lean()
}

/**
 * Fetch CommissionRule records for a given layer (same filter logic as above).
 */
async function fetchCommRules({ companyId, appliedLayer, providerType, providerPartner, providerPartners, partnerIds, today }) {
  const andConditions = [
    { company: new mongoose.Types.ObjectId(companyId) },
    { appliedLayer },
    { status: "Active" },
    { isActive: true },
    { isDeleted: false },
    { effectiveDate: { $lte: today } },
    { $or: [{ expiryDate: null }, { expiryDate: { $gte: today } }] },
  ]

  if (providerType) andConditions.push({ providerType })
  if (providerPartner) {
    andConditions.push({ providerPartner: new mongoose.Types.ObjectId(providerPartner) })
  } else if (providerPartners && providerPartners.length > 0) {
    andConditions.push({
      providerPartner: { $in: providerPartners.map(id => new mongoose.Types.ObjectId(id)) }
    })
  }

  if (partnerIds && partnerIds.length > 0) {
    const oids = partnerIds.map((id) => new mongoose.Types.ObjectId(id))
    andConditions.push({
      $or: [
        { partnerScope: "AllChildPartners" },
        { partnerScope: "SpecificPartner", partner: { $in: oids } },
      ],
    })
  }

  return CommissionRule.find({ $and: andConditions }).lean()
}

// ─── Main Export ───────────────────────────────────────────────────────────────

/**
 * Apply full pricing pipeline for a selling-agent trip search (per unit price).
 *
 * Flow (all 3 layers run sequentially):
 *   Company markup/discount → Marine markup/discount → Commercial markup/discount
 *   Commission: calculated per layer on the price AT that layer — does NOT change finalPrice.
 *
 * @param {Object}  params
 * @param {number}  params.basePrice            - Basic price (Fare only) from price list
 * @param {string}  params.companyId
 * @param {string}  params.category             - passenger / vehicle / cargo
 * @param {string}  params.cabinId
 * @param {string}  params.payloadTypeId
 * @param {string}  params.originPort
 * @param {string}  params.destinationPort
 * @param {string}  [params.visaType]
 * @param {Object}  params.pricingHierarchy     - { companyParentId, marineParentId, commercialParentId }
 *
 * @returns {Promise<Object>} {
 *   basePrice,
 *   finalPrice,               — price after all markup/discount
 *   totalCommission,          — sum across all layers (does NOT affect finalPrice)
 *   commissionBreakdown: { company, marine, commercial },
 *   appliedRules,             — rules that actually changed the price
 *   layerDebug,               — per-layer full debug info (rules found, amounts, price flow)
 * }
 */
async function applyPricingRules({
  basePrice,
  companyId,
  category,
  cabinId,
  payloadTypeId,
  originPort,
  destinationPort,
  visaType,
  partnerId,                // ✅ Selling Agent's own partner ID
  pricingHierarchy = {},
}) {
  const { marineParentId, commercialParentId } = pricingHierarchy

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Booking context for specificity scoring
  const ctx = { category, cabinId, payloadTypeId, visaType, originPort, destinationPort }

  let currentPrice = basePrice
  const appliedRules = []
  const layerDebug = []

  // Commission amounts per layer (accumulated)
  let companyCommAmt = 0
  let marineCommAmt = 0
  let commercialCommAmt = 0
  let sellingCommAmt = 0

  // ────────── Layer 1: Company (FOR Marine Agent) ───────────────────────────
  const priceInCompany = currentPrice

  const companyMDRules = await fetchMDRules({
    companyId,
    appliedLayer: "Marine Agent",
    providerType: "Company",
    partnerIds: marineParentId ? [marineParentId] : null,
    today,
  })
  const companyMDQualified = companyMDRules.filter((r) => ruleMatchesBooking(r, ctx))
  const bestCompanyMD = selectBestRule(companyMDRules, ctx)

  let companyMDDelta = 0
  if (bestCompanyMD) {
    const { newPrice, delta } = applyMarkupDiscount(currentPrice, bestCompanyMD)
    companyMDDelta = delta
    currentPrice = newPrice
    appliedRules.push({
      layer: "Company",
      ruleType: bestCompanyMD.ruleType,
      ruleName: bestCompanyMD.ruleName,
      ruleId: bestCompanyMD._id,
      valueType: bestCompanyMD.valueType,
      ruleValue: bestCompanyMD.ruleValue,
      priority: bestCompanyMD.priority,
      appliedAmount: round2(delta),
      priceAfter: round2(currentPrice),
    })
  }

  const priceAfterCompanyMD = currentPrice

  const companyCommRules = await fetchCommRules({
    companyId,
    appliedLayer: "Marine Agent",
    providerType: "Company",
    partnerIds: marineParentId ? [marineParentId] : null,
    today,
  })
  const companyCommQualified = companyCommRules.filter((r) => ruleMatchesBooking(r, ctx))
  const bestCompanyComm = selectBestRule(companyCommRules, ctx)
  companyCommAmt = calcCommission(currentPrice, bestCompanyComm)

  layerDebug.push({
    layer: "Company → Marine",
    priceIn: round2(priceInCompany),
    rulesFound: {
      markupDiscount: { total: companyMDRules.length, qualified: companyMDQualified.length },
      commission: { total: companyCommRules.length, qualified: companyCommQualified.length },
    },
    markupDiscountRule: bestCompanyMD
      ? {
          ruleId: bestCompanyMD._id,
          ruleName: bestCompanyMD.ruleName,
          ruleType: bestCompanyMD.ruleType,
          valueType: bestCompanyMD.valueType,
          ruleValue: bestCompanyMD.ruleValue,
          priority: bestCompanyMD.priority,
          specificity: bestCompanyMD._spec,
          appliedAmount: round2(companyMDDelta),
        }
      : null,
    priceAfterMarkup: round2(priceAfterCompanyMD),
    commissionRule: bestCompanyComm
      ? {
          ruleId: bestCompanyComm._id,
          ruleName: bestCompanyComm.ruleName,
          commissionType: bestCompanyComm.commissionType,
          commissionValue: bestCompanyComm.commissionValue,
          priority: bestCompanyComm.priority,
          commissionAmount: round2(companyCommAmt),
        }
      : null,
    priceOut: round2(currentPrice),
  })

  console.log(
    `[PricingRules][Company] found=${companyMDRules.length} MD rules, ${companyMDQualified.length} qualified | ` +
    `markup: ${bestCompanyMD ? `"${bestCompanyMD.ruleName}" (priority=${bestCompanyMD.priority}, spec=${bestCompanyMD._spec}) → ${bestCompanyMD.ruleType} ${round2(companyMDDelta)}` : 'none matched'} | ` +
    `priceAfterMarkup=${round2(priceAfterCompanyMD)} | ` +
    `commission: ${bestCompanyComm ? `"${bestCompanyComm.ruleName}" → ${round2(companyCommAmt)}` : 'none matched'} | ` +
    `priceOut=${round2(currentPrice)}`
  )

  // ────────── Layer 2: Marine Agent (FOR Commercial Agent) ─────────────────
  const priceInMarine = currentPrice

  if (marineParentId) {
    const marineMDRules = await fetchMDRules({
      companyId,
      appliedLayer: "Commercial Agent",
      providerPartner: marineParentId,
      partnerIds: commercialParentId ? [commercialParentId] : null,
      today,
    })
    const marineMDQualified = marineMDRules.filter((r) => ruleMatchesBooking(r, ctx))
    const bestMarineMD = selectBestRule(marineMDRules, ctx)

    let marineMDDelta = 0
    if (bestMarineMD) {
      const { newPrice, delta } = applyMarkupDiscount(currentPrice, bestMarineMD)
      marineMDDelta = delta
      currentPrice = newPrice
      appliedRules.push({
        layer: "Marine Agent",
        ruleType: bestMarineMD.ruleType,
        ruleName: bestMarineMD.ruleName,
        ruleId: bestMarineMD._id,
        valueType: bestMarineMD.valueType,
        ruleValue: bestMarineMD.ruleValue,
        priority: bestMarineMD.priority,
        appliedAmount: round2(delta),
        priceAfter: round2(currentPrice),
      })
    }

    const priceAfterMarineMD = currentPrice

    const marineCommRules = await fetchCommRules({
      companyId,
      appliedLayer: "Commercial Agent",
      providerPartner: marineParentId,
      partnerIds: commercialParentId ? [commercialParentId] : null,
      today,
    })
    const marineCommQualified = marineCommRules.filter((r) => ruleMatchesBooking(r, ctx))
    const bestMarineComm = selectBestRule(marineCommRules, ctx)
    marineCommAmt = calcCommission(currentPrice, bestMarineComm)

    layerDebug.push({
      layer: "Marine → Commercial",
      marineParentId,
      priceIn: round2(priceInMarine),
      rulesFound: {
        markupDiscount: { total: marineMDRules.length, qualified: marineMDQualified.length },
        commission: { total: marineCommRules.length, qualified: marineCommQualified.length },
      },
      markupDiscountRule: bestMarineMD
        ? {
            ruleId: bestMarineMD._id,
            ruleName: bestMarineMD.ruleName,
            ruleType: bestMarineMD.ruleType,
            valueType: bestMarineMD.valueType,
            ruleValue: bestMarineMD.ruleValue,
            priority: bestMarineMD.priority,
            specificity: bestMarineMD._spec,
            appliedAmount: round2(marineMDDelta),
          }
        : null,
      priceAfterMarkup: round2(priceAfterMarineMD),
      commissionRule: bestMarineComm
        ? {
            ruleId: bestMarineComm._id,
            ruleName: bestMarineComm.ruleName,
            commissionType: bestMarineComm.commissionType,
            commissionValue: bestMarineComm.commissionValue,
            priority: bestMarineComm.priority,
            commissionAmount: round2(marineCommAmt),
          }
        : null,
      priceOut: round2(currentPrice),
    })

    console.log(
      `[PricingRules][Marine] marineParentId=${marineParentId} | found=${marineMDRules.length} MD, ${marineMDQualified.length} qualified | ` +
      `markup: ${bestMarineMD ? `"${bestMarineMD.ruleName}" (priority=${bestMarineMD.priority}, spec=${bestMarineMD._spec}) → ${bestMarineMD.ruleType} ${round2(marineMDDelta)}` : 'none matched'} | ` +
      `priceAfterMarkup=${round2(priceAfterMarineMD)} | ` +
      `commission: ${bestMarineComm ? `"${bestMarineComm.ruleName}" → ${round2(marineCommAmt)}` : 'none matched'} | ` +
      `priceOut=${round2(currentPrice)}`
    )
  } else {
    layerDebug.push({
      layer: "Marine Agent",
      skipped: true,
      reason: "No marineParentId in token",
      priceIn: round2(priceInMarine),
      priceOut: round2(currentPrice),
    })
    console.log(`[PricingRules][Marine] SKIPPED — no marineParentId in token`)
  }

  // ────────── Layer 3: Commercial Agent (FOR Selling Agent) ─────────────────
  const priceInCommercial = currentPrice

  if (commercialParentId) {
    const commercialMDRules = await fetchMDRules({
      companyId,
      appliedLayer: "Selling Agent",
      providerPartner: commercialParentId,
      partnerIds: partnerId ? [partnerId] : null,
      today,
    })
    const commercialMDQualified = commercialMDRules.filter((r) => ruleMatchesBooking(r, ctx))
    const bestCommercialMD = selectBestRule(commercialMDRules, ctx)

    let commercialMDDelta = 0
    if (bestCommercialMD) {
      const { newPrice, delta } = applyMarkupDiscount(currentPrice, bestCommercialMD)
      commercialMDDelta = delta
      currentPrice = newPrice
      appliedRules.push({
        layer: "Commercial Agent",
        ruleType: bestCommercialMD.ruleType,
        ruleName: bestCommercialMD.ruleName,
        ruleId: bestCommercialMD._id,
        valueType: bestCommercialMD.valueType,
        ruleValue: bestCommercialMD.ruleValue,
        priority: bestCommercialMD.priority,
        appliedAmount: round2(delta),
        priceAfter: round2(currentPrice),
      })
    }

    const priceAfterCommercialMD = currentPrice

    const commercialCommRules = await fetchCommRules({
      companyId,
      appliedLayer: "Selling Agent",
      providerPartner: commercialParentId,
      partnerIds: partnerId ? [partnerId] : null,
      today,
    })
    const commercialCommQualified = commercialCommRules.filter((r) => ruleMatchesBooking(r, ctx))
    const bestCommercialComm = selectBestRule(commercialCommRules, ctx)
    commercialCommAmt = calcCommission(currentPrice, bestCommercialComm)

    layerDebug.push({
      layer: "Commercial Agent",
      commercialParentId,
      sellingPartnerId: partnerId,
      priceIn: round2(priceInCommercial),
      rulesFound: {
        markupDiscount: { total: commercialMDRules.length, qualified: commercialMDQualified.length },
        commission: { total: commercialCommRules.length, qualified: commercialCommQualified.length },
      },
      markupDiscountRule: bestCommercialMD
        ? {
            ruleId: bestCommercialMD._id,
            ruleName: bestCommercialMD.ruleName,
            ruleType: bestCommercialMD.ruleType,
            valueType: bestCommercialMD.valueType,
            ruleValue: bestCommercialMD.ruleValue,
            priority: bestCommercialMD.priority,
            specificity: bestCommercialMD._spec,
            appliedAmount: round2(commercialMDDelta),
          }
        : null,
      priceAfterMarkup: round2(priceAfterCommercialMD),
      commissionRule: bestCommercialComm
        ? {
            ruleId: bestCommercialComm._id,
            ruleName: bestCommercialComm.ruleName,
            commissionType: bestCommercialComm.commissionType,
            commissionValue: bestCommercialComm.commissionValue,
            priority: bestCommercialComm.priority,
            commissionAmount: round2(commercialCommAmt),
          }
        : null,
      priceOut: round2(currentPrice),
    })

    console.log(
      `[PricingRules][Commercial] provider=${commercialParentId} | found=${commercialMDRules.length} MD, ${commercialMDQualified.length} qualified | ` +
      `markup: ${bestCommercialMD ? `"${bestCommercialMD.ruleName}" (priority=${bestCommercialMD.priority}, spec=${bestCommercialMD._spec}) → ${bestCommercialMD.ruleType} ${round2(commercialMDDelta)}` : 'none matched'} | ` +
      `priceAfterMarkup=${round2(priceAfterCommercialMD)} | ` +
      `commission: ${bestCommercialComm ? `"${bestCommercialComm.ruleName}" → ${round2(commercialCommAmt)}` : 'none matched'} | ` +
      `priceOut=${round2(currentPrice)}`
    )
  } else {
    layerDebug.push({
      layer: "Commercial Agent",
      skipped: true,
      reason: "No commercialParentId in token",
      priceIn: round2(priceInCommercial),
      priceOut: round2(currentPrice),
    })
    console.log(`[PricingRules][Commercial] SKIPPED — no commercialParentId in token`)
  }

  // ────────── Layer 4: Selling Agent (FOR self / own users) ─────────────────
  const priceInSelling = currentPrice

  if (partnerId) {
    const sellingMDRules = await fetchMDRules({
      companyId,
      appliedLayer: "Selling Agent",
      providerPartner: partnerId,
      partnerIds: [partnerId],
      today,
    })
    const sellingMDQualified = sellingMDRules.filter((r) => ruleMatchesBooking(r, ctx))
    const bestSellingMD = selectBestRule(sellingMDRules, ctx)

    let sellingMDDelta = 0
    if (bestSellingMD) {
      const { newPrice, delta } = applyMarkupDiscount(currentPrice, bestSellingMD)
      sellingMDDelta = delta
      currentPrice = newPrice
      appliedRules.push({
        layer: "Selling Agent",
        ruleType: bestSellingMD.ruleType,
        ruleName: bestSellingMD.ruleName,
        ruleId: bestSellingMD._id,
        valueType: bestSellingMD.valueType,
        ruleValue: bestSellingMD.ruleValue,
        priority: bestSellingMD.priority,
        appliedAmount: round2(delta),
        priceAfter: round2(currentPrice),
      })
    }

    const priceAfterSellingMD = currentPrice

    const sellingCommRules = await fetchCommRules({
      companyId,
      appliedLayer: "Selling Agent",
      providerPartner: partnerId,
      partnerIds: [partnerId],
      today,
    })
    const sellingCommQualified = sellingCommRules.filter((r) => ruleMatchesBooking(r, ctx))
    const bestSellingComm = selectBestRule(sellingCommRules, ctx)
    sellingCommAmt = calcCommission(currentPrice, bestSellingComm)

    layerDebug.push({
      layer: "Selling Agent",
      sellingPartnerId: partnerId,
      priceIn: round2(priceInSelling),
      rulesFound: {
        markupDiscount: { total: sellingMDRules.length, qualified: sellingMDQualified.length },
        commission: { total: sellingCommRules.length, qualified: sellingCommQualified.length },
      },
      markupDiscountRule: bestSellingMD
        ? {
            ruleId: bestSellingMD._id,
            ruleName: bestSellingMD.ruleName,
            ruleType: bestSellingMD.ruleType,
            valueType: bestSellingMD.valueType,
            ruleValue: bestSellingMD.ruleValue,
            priority: bestSellingMD.priority,
            specificity: bestSellingMD._spec,
            appliedAmount: round2(sellingMDDelta),
          }
        : null,
      priceAfterMarkup: round2(priceAfterSellingMD),
      commissionRule: bestSellingComm
        ? {
            ruleId: bestSellingComm._id,
            ruleName: bestSellingComm.ruleName,
            commissionType: bestSellingComm.commissionType,
            commissionValue: bestSellingComm.commissionValue,
            priority: bestSellingComm.priority,
            commissionAmount: round2(sellingCommAmt),
          }
        : null,
      priceOut: round2(currentPrice),
    })

    console.log(
      `[PricingRules][Selling] provider=${partnerId} | found=${sellingMDRules.length} MD, ${sellingMDQualified.length} qualified | ` +
      `markup: ${bestSellingMD ? `"${bestSellingMD.ruleName}" (priority=${bestSellingMD.priority}, spec=${bestSellingMD._spec}) → ${bestSellingMD.ruleType} ${round2(sellingMDDelta)}` : 'none matched'} | ` +
      `priceAfterMarkup=${round2(priceAfterSellingMD)} | ` +
      `commission: ${bestSellingComm ? `"${bestSellingComm.ruleName}" → ${round2(sellingCommAmt)}` : 'none matched'} | ` +
      `priceOut=${round2(currentPrice)}`
    )
  } else {
    layerDebug.push({
      layer: "Selling Agent",
      skipped: true,
      reason: "No partnerId in token",
      priceIn: round2(priceInSelling),
      priceOut: round2(currentPrice),
    })
    console.log(`[PricingRules][Selling] SKIPPED — no partnerId in token`)
  }

  const totalCommission = round2(companyCommAmt + marineCommAmt + commercialCommAmt + sellingCommAmt)

  console.log(`[PricingRules] SUMMARY: base=${round2(basePrice)} → final=${round2(currentPrice)} | totalCommission=${totalCommission} | rulesApplied=${appliedRules.length}`)

  return {
    basePrice: round2(basePrice),
    finalPrice: round2(currentPrice),
    totalCommission,
    commissionBreakdown: {
      company: round2(companyCommAmt),
      marine: round2(marineCommAmt),
      commercial: round2(commercialCommAmt),
      selling: round2(sellingCommAmt),
    },
    appliedRules,
    layerDebug,
  }
}

module.exports = { applyPricingRules }
