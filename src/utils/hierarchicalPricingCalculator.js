const mongoose = require("mongoose");
const { Promotion } = require("../models/Promotion");
const { MarkupDiscountRule } = require("../models/MarkupDiscountRule");
const { CommissionRule } = require("../models/CommissionRule");

/**
 * HIERARCHICAL PRICING CALCULATOR
 * 
 * Implements the full pricing flow for ferry booking system:
 * Company → Marine → Commercial → Selling
 * 
 * FLOW:
 * 1. Find current user's layer (e.g., Selling Agent)
 * 2. Build parent hierarchy backwards (Selling → Commercial → Marine → Company)
 * 3. For each layer, fetch rules matching trip search params
 * 4. If multiple rules match, use PRIORITY (highest first)
 * 5. Always check effective date and expiry date
 * 6. Calculate sequentially through all layers
 * 7. Each layer receives reduced price from previous layer (after commission)
 * 
 * Rules:
 * - Promotion applied ONCE at Company level only
 * - All layers always calculated (no skipping)
 * - Commission always reduces final price (parent earnings)
 * - Each layer works on previous layer's adjusted price (after commission deduction)
 * - Full breakdown returned for all layers
 */

// Hierarchy levels in order
const HIERARCHY_LEVELS = ["company", "marine", "commercial", "selling"];

const LAYER_NAMES = {
  company: "Company",
  marine: "Marine Agent",
  commercial: "Commercial Agent",
  selling: "Selling Agent",
};

// Reverse mapping: layer name to position in hierarchy
const LAYER_PRIORITY = {
  "Company": 0,
  "Marine Agent": 1,
  "Commercial Agent": 2,
  "Selling Agent": 3,
};

/**
 * Get applicable markup/discount rule for a layer
 * 
 * Fetches rules matching:
 * - Company
 * - Applied layer
 * - Date range (effective date <= today <= expiry date)
 * - Trip params (route, visa, partner scope)
 * - Service details (payload type + cabin)
 * 
 * Returns HIGHEST PRIORITY rule only (if multiple match)
 */
const getMarkupDiscountRule = async (params) => {
  const {
    companyId,
    layer,
    category,
    partnerId,
    visaType,
    originPort,
    destinationPort,
    payloadTypeId,
    cabinId,
  } = params;

  const currentDate = new Date();

  const query = {
    company: new mongoose.Types.ObjectId(companyId),
    appliedLayer: LAYER_NAMES[layer],
    status: "Active",
    isDeleted: false,
    // CHECK EFFECTIVE AND EXPIRY DATES
    effectiveDate: { $lte: currentDate },
    expiryDate: { $gte: currentDate },
  };

  // COMPULSORY ROUTE MATCHING - must match (route, payload, cabin)
  query.routes = {
    $elemMatch: {
      routeFrom: new mongoose.Types.ObjectId(originPort),
      routeTo: new mongoose.Types.ObjectId(destinationPort),
    },
  };

  // Partner scope - if not company layer, filter by partner
  if (layer !== "company" && partnerId) {
    query.$or = [
      {
        partnerScope: "AllChildPartners",
      },
      {
        partnerScope: "SpecificPartner",
        partner: new mongoose.Types.ObjectId(partnerId),
      },
    ];
  }

  // Visa type filter (compulsory if specified)
  if (visaType) {
    query.visaType = visaType;
  }

  const rules = await MarkupDiscountRule.find(query)
    .populate("serviceDetails.passenger.payloadTypeId")
    .populate("serviceDetails.passenger.cabinId")
    .populate("serviceDetails.cargo.payloadTypeId")
    .populate("serviceDetails.cargo.cabinId")
    .populate("serviceDetails.vehicle.payloadTypeId")
    .populate("serviceDetails.vehicle.cabinId")
    // SORT BY PRIORITY (highest first)
    .sort({ priority: -1 })
    .lean();

  // COMPULSORY PAYLOAD + CABIN MATCHING
  const applicableRules = rules.filter((rule) => {
    const serviceDetails = rule.serviceDetails?.[category] || [];

    // Must have service details matching payload + cabin
    return serviceDetails.some(
      (detail) =>
        detail.payloadTypeId &&
        detail.cabinId &&
        detail.payloadTypeId._id?.toString() === payloadTypeId?.toString() &&
        detail.cabinId._id?.toString() === cabinId?.toString()
    );
  });

  // Return FIRST rule (highest priority)
  return applicableRules.length > 0 ? applicableRules[0] : null;
};

/**
 * Get applicable commission rule for a layer
 * 
 * Same matching logic as markup/discount:
 * - Checks effective date and expiry date
 * - Matches by route, visa, partner scope
 * - Matches by service details (payload + cabin)
 * - Returns HIGHEST PRIORITY rule only
 */
const getCommissionRule = async (params) => {
  const {
    companyId,
    layer,
    category,
    partnerId,
    visaType,
    originPort,
    destinationPort,
    payloadTypeId,
    cabinId,
  } = params;

  const currentDate = new Date();

  const query = {
    company: new mongoose.Types.ObjectId(companyId),
    appliedLayer: LAYER_NAMES[layer],
    status: "Active",
    isDeleted: false,
    // CHECK EFFECTIVE AND EXPIRY DATES
    effectiveDate: { $lte: currentDate },
    expiryDate: { $gte: currentDate },
  };

  // COMPULSORY ROUTE MATCHING - must match (route, payload, cabin)
  query.routes = {
    $elemMatch: {
      routeFrom: new mongoose.Types.ObjectId(originPort),
      routeTo: new mongoose.Types.ObjectId(destinationPort),
    },
  };

  // Partner scope
  if (layer !== "company" && partnerId) {
    query.$or = [
      {
        partnerScope: "AllChildPartners",
      },
      {
        partnerScope: "SpecificPartner",
        partner: new mongoose.Types.ObjectId(partnerId),
      },
    ];
  }

  // Visa type filter (compulsory if specified)
  if (visaType) {
    query.visaType = visaType;
  }

  const rules = await CommissionRule.find(query)
    .populate("serviceDetails.passenger.payloadTypeId")
    .populate("serviceDetails.passenger.cabinId")
    .populate("serviceDetails.cargo.payloadTypeId")
    .populate("serviceDetails.cargo.cabinId")
    .populate("serviceDetails.vehicle.payloadTypeId")
    .populate("serviceDetails.vehicle.cabinId")
    // SORT BY PRIORITY (highest first)
    .sort({ priority: -1 })
    .lean();

  // COMPULSORY PAYLOAD + CABIN MATCHING
  const applicableRules = rules.filter((rule) => {
    const serviceDetails = rule.serviceDetails?.[category] || [];

    // Must have service details matching payload + cabin
    return serviceDetails.some(
      (detail) =>
        detail.payloadTypeId &&
        detail.cabinId &&
        detail.payloadTypeId._id?.toString() === payloadTypeId?.toString() &&
        detail.cabinId._id?.toString() === cabinId?.toString()
    );
  });

  // Return FIRST rule (highest priority)
  return applicableRules.length > 0 ? applicableRules[0] : null;
};

/**
 * Get promotion rule for company level ONLY
 * Promotion is applied ONCE at company level only
 * 
 * FLOW:
 * 1. Try to find TRIP-BASED promotion (if tripId provided)
 * 2. If not found, try to find PERIOD-BASED promotion
 * 3. Both must match: compulsory route + payload + cabin
 * 
 * Checks:
 * - Company
 * - Status active
 * - Date range valid
 * - Category eligibility (passenger/cargo/vehicle)
 * - COMPULSORY: Route match (if defined)
 * - COMPULSORY: Payload + Cabin match
 */
const getPromotionRule = async (params) => {
  const {
    companyId,
    category,
    payloadTypeId,
    cabinId,
    originPort,
    destinationPort,
    tripId,
  } = params;

  const currentDate = new Date();

  const baseQuery = {
    company: new mongoose.Types.ObjectId(companyId),
    status: "Active",
    isDeleted: false,
  };

  // STEP 1: Try TRIP-BASED promotion first
  // COMPULSORY MATCHING: route + payload + cabin
  if (tripId) {
    const tripQuery = {
      ...baseQuery,
      promotionBasis: "Trip",
      trip: new mongoose.Types.ObjectId(tripId),
    };

    // COMPULSORY ROUTE MATCHING for trip-based too
    if (originPort && destinationPort) {
      tripQuery.routes = {
        $elemMatch: {
          routeFrom: new mongoose.Types.ObjectId(originPort),
          routeTo: new mongoose.Types.ObjectId(destinationPort),
        },
      };
    }

    const tripPromo = await Promotion.findOne(tripQuery).lean();

    // Check payload + cabin eligibility (COMPULSORY)
    if (tripPromo && matchesPromotionEligibility(tripPromo, category, payloadTypeId, cabinId)) {
      return tripPromo;
    }
  }

  // STEP 2: If trip-based not found, try PERIOD-BASED promotion
  const periodQuery = {
    ...baseQuery,
    promotionBasis: "Period",
    // CHECK DATE RANGE
    startDate: { $lte: currentDate },
    endDate: { $gte: currentDate },
  };

  // COMPULSORY ROUTE MATCHING for period-based
  if (originPort && destinationPort) {
    periodQuery.routes = {
      $elemMatch: {
        routeFrom: new mongoose.Types.ObjectId(originPort),
        routeTo: new mongoose.Types.ObjectId(destinationPort),
      },
    };
  }

  const periodPromo = await Promotion.findOne(periodQuery).lean();

  if (periodPromo && matchesPromotionEligibility(periodPromo, category, payloadTypeId, cabinId)) {
    return periodPromo;
  }

  return null;
};

/**
 * Helper function to check if promotion matches category and payload+cabin eligibility
 */
const matchesPromotionEligibility = (promotion, category, payloadTypeId, cabinId) => {
  if (category === "passenger") {
    return (
      promotion.passenger &&
      promotion.passenger.isEnabled &&
      promotion.passenger.eligibility &&
      promotion.passenger.eligibility.some(
        (e) =>
          e.passengerTypeId?.toString() === payloadTypeId?.toString() &&
          e.cabinId?.toString() === cabinId?.toString()
      )
    );
  } else if (category === "cargo") {
    return (
      promotion.cargo &&
      promotion.cargo.isEnabled &&
      promotion.cargo.eligibility &&
      promotion.cargo.eligibility.some(
        (e) => e.payloadId?.toString() === payloadTypeId?.toString()
      )
    );
  } else if (category === "vehicle") {
    return (
      promotion.vehicle &&
      promotion.vehicle.isEnabled &&
      promotion.vehicle.eligibility &&
      promotion.vehicle.eligibility.some(
        (e) => e.payloadId?.toString() === payloadTypeId?.toString()
      )
    );
  }
  return false;
};

/**
 * Calculate markup/discount value
 */
const calculateMarkupDiscount = (rule, basePrice) => {
  if (!rule || rule.ruleValue === null || rule.ruleValue === undefined) {
    return 0;
  }

  if (rule.valueType === "percentage") {
    const adjustment = (basePrice * rule.ruleValue) / 100;
    return rule.ruleType === "Markup" ? adjustment : -adjustment;
  } else if (rule.valueType === "fixed") {
    return rule.ruleType === "Markup" ? rule.ruleValue : -rule.ruleValue;
  }

  return 0;
};

/**
 * Calculate commission value
 */
const calculateCommission = (rule, basePrice) => {
  if (!rule || rule.commissionValue === null || rule.commissionValue === undefined) {
    return 0;
  }

  if (rule.commissionType === "percentage") {
    return (basePrice * rule.commissionValue) / 100;
  } else if (rule.commissionType === "fixed") {
    return rule.commissionValue;
  }

  return 0;
};

/**
 * Calculate promotion discount
 * Returns negative value (deduction from price)
 */
const calculatePromotionDiscount = (promotionRules, basePrice, quantity, category) => {
  let totalDiscount = 0;

  for (const promo of promotionRules) {
    const servicePromo = promo[category];
    if (!servicePromo || !servicePromo.isEnabled) continue;

    let discountValue = 0;

    if (servicePromo.calculationType === "quantity") {
      // Buy X Get Y discount (quantity-based)
      const { buyX, getY } = servicePromo;
      if (buyX && getY && quantity >= buyX) {
        const freeUnits = Math.floor(quantity / buyX) * getY;
        discountValue = freeUnits * (basePrice / quantity);
      }
    } else if (servicePromo.calculationType === "value") {
      // Min value + percentage discount (value-based)
      const { minValue, discountType, discountValue: discountVal } = servicePromo;
      if (minValue && basePrice >= minValue && discountVal) {
        if (discountType === "percentage") {
          discountValue = (basePrice * discountVal) / 100;
        } else if (discountType === "fixed") {
          discountValue = discountVal;
        }
      }
    }

    totalDiscount += discountValue;
  }

  return -totalDiscount; // Negative value (deduction)
};

/**
 * Calculate hierarchical pricing following the CORRECT FLOW:
 * 
 * FLOW:
 * 1. Get promotion rule (Company level only)
 * 2. For each layer (company → marine → commercial → selling):
 *    a. Fetch markup/discount rule matching trip params and priority
 *    b. Fetch commission rule matching trip params and priority
 *    c. Apply markup/discount to current price
 *    d. Apply commission on adjusted price
 *    e. Pass reduced price to next layer
 * 3. Return complete breakdown for all layers
 * 
 * CRITICAL RULES:
 * 1. Promotion applied ONCE at Company level ONLY (then shown in all layers)
 * 2. All 4 layers always calculated (no skipping)
 * 3. Each layer receives REDUCED price from previous (after commission)
 * 4. Commission calculated on ADJUSTED price (after markup/discount)
 * 5. If multiple rules match, use PRIORITY (highest first)
 * 6. Always check effective date and expiry date
 * 7. If no rule found, use 0 value
 * 
 * @param {Object} params
 * @returns {Object} Pricing breakdown for all layers
 */
const calculateHierarchicalPricing = async (params) => {
  const {
    basePrice,
    quantity,
    companyId,
    category,
    partnerId,
    visaType,
    originPort,
    destinationPort,
    payloadTypeId,
    cabinId,
  } = params;

  const breakdown = {};
  let currentPrice = basePrice;
  let promotionValue = 0; // Company-level promotion applied once

  // Validate inputs
  if (basePrice < 0) throw new Error("Base price cannot be negative");
  if (quantity < 1) throw new Error("Quantity must be at least 1");

  // STEP 1: Fetch promotion rule (Company level only) - DONE ONCE
  const promotionRule = await getPromotionRule({
    companyId,
    category,
    payloadTypeId,
    cabinId,
    originPort,
    destinationPort,
    tripId: params.tripId || null, // Optional trip ID
  });

  if (promotionRule) {
    const promoDiscount = calculatePromotionDiscount(
      [promotionRule],
      basePrice,
      quantity,
      category
    );
    promotionValue = promoDiscount;
    console.log("[v0] PROMOTION FOUND:", {
      ruleName: promotionRule?.ruleName,
      basis: promotionRule?.promotionBasis,
      category,
      promotionValue: Math.round(promotionValue * 100) / 100,
      basePrice,
    });
  } else {
    console.log("[v0] NO PROMOTION FOUND for:", { category, payloadTypeId, cabinId });
  }

  // STEP 2: Calculate for each layer sequentially
  console.log("[v0] ========== STARTING HIERARCHICAL PRICING CALCULATION ==========");
  console.log("[v0] Base Price:", basePrice, "Quantity:", quantity, "Promotion Applied:", Math.round(promotionValue * 100) / 100);
  console.log("[v0] Route:", originPort, "→", destinationPort, "| Category:", category);

  for (const level of HIERARCHY_LEVELS) {
    console.log(`\n[v0] --- CALCULATING ${level.toUpperCase()} LAYER ---`);

    // Fetch markup/discount rule for THIS LAYER (highest priority only)
    const markupDiscountRule = await getMarkupDiscountRule({
      companyId,
      layer: level,
      category,
      partnerId: level !== "company" ? partnerId : null,
      visaType,
      originPort,
      destinationPort,
      payloadTypeId,
      cabinId,
    });

    // Fetch commission rule for THIS LAYER (highest priority only)
    const commissionRule = await getCommissionRule({
      companyId,
      layer: level,
      category,
      partnerId: level !== "company" ? partnerId : null,
      visaType,
      originPort,
      destinationPort,
      payloadTypeId,
      cabinId,
    });

    // Calculate markup/discount on current price (or 0 if no rule)
    const markupDiscountValue = markupDiscountRule
      ? calculateMarkupDiscount(markupDiscountRule, currentPrice)
      : 0;

    // Calculate adjusted price after markup/discount
    const priceAfterMarkupDiscount = currentPrice + markupDiscountValue;

    // Calculate commission on adjusted price (or 0 if no rule)
    const commissionValue = commissionRule
      ? calculateCommission(commissionRule, priceAfterMarkupDiscount)
      : 0;

    // Visible price for this layer is price after markup but before commission
    const visiblePrice = priceAfterMarkupDiscount;

    // Final price for this layer (what gets passed to next layer)
    const finalPrice = priceAfterMarkupDiscount - commissionValue;

    // DEBUG: Print layer-wise calculation
    console.log(`[v0] ${level} Incoming Base Price:`, Math.round(currentPrice * 100) / 100);
    console.log(`[v0] ${level} Markup/Discount Rule:`, {
      name: markupDiscountRule?.ruleName || "NO RULE",
      type: markupDiscountRule?.ruleType || "-",
      value: markupDiscountRule?.ruleValue || 0,
      calculated: Math.round(markupDiscountValue * 100) / 100,
    });
    console.log(`[v0] ${level} Price After Markup/Discount:`, Math.round(priceAfterMarkupDiscount * 100) / 100);
    console.log(`[v0] ${level} Commission Rule:`, {
      name: commissionRule?.ruleName || "NO RULE",
      type: commissionRule?.commissionType || "-",
      value: commissionRule?.commissionValue || 0,
      calculated: Math.round(commissionValue * 100) / 100,
    });
    console.log(`[v0] ${level} Final Price (after commission):`, Math.round(finalPrice * 100) / 100);
    console.log(`[v0] ${level} Visible Price to Customer:`, Math.round(visiblePrice * 100) / 100);
    console.log(`[v0] ${level} Net Earning/Commission:`, Math.round(commissionValue * 100) / 100);

    // Store breakdown for this layer
    breakdown[level] = {
      basePrice: Math.round(currentPrice * 100) / 100,
      markupDiscount: {
        ruleName: markupDiscountRule?.ruleName || null,
        ruleType: markupDiscountRule?.ruleType || null,
        value: Math.round(markupDiscountValue * 100) / 100,
      },
      commission: {
        ruleName: commissionRule?.ruleName || null,
        commissionType: commissionRule?.commissionType || null,
        value: Math.round(commissionValue * 100) / 100,
      },
      promotion: {
        // Show promotion in all layers for visibility
        value: Math.round(promotionValue * 100) / 100,
      },
      priceBeforeCommission: Math.round(visiblePrice * 100) / 100,
      finalPrice: Math.round(finalPrice * 100) / 100,
      visiblePrice: Math.round(visiblePrice * 100) / 100, // Price customer of this tier pays
      netEarning: Math.round(commissionValue * 100) / 100, // Commission earned
    };

    // Update current price for NEXT layer (reduced by commission)
    currentPrice = finalPrice;
  }

  console.log(`\n[v0] ========== HIERARCHICAL PRICING CALCULATION COMPLETE ==========`);
  console.log(`[v0] FINAL CUSTOMER PRICE: ${Math.round(currentPrice * 100) / 100}`);

  // Final summary debug log
  console.log(`[v0] FINAL PRICING SUMMARY:`);
  console.log(`[v0] Base Price: ${Math.round(basePrice * 100) / 100}`);
  console.log(`[v0] Total Promotion Applied: ${Math.round(promotionValue * 100) / 100}`);
  console.log(`[v0] Visible Price by Role:`, {
    company: Math.round(breakdown.company.visiblePrice * 100) / 100,
    marine: Math.round(breakdown.marine.visiblePrice * 100) / 100,
    commercial: Math.round(breakdown.commercial.visiblePrice * 100) / 100,
    selling: Math.round(breakdown.selling.visiblePrice * 100) / 100,
  });
  console.log(`[v0] Total Commissions by Layer:`, {
    company: Math.round(breakdown.company.netEarning * 100) / 100,
    marine: Math.round(breakdown.marine.netEarning * 100) / 100,
    commercial: Math.round(breakdown.commercial.netEarning * 100) / 100,
    selling: Math.round(breakdown.selling.netEarning * 100) / 100,
    totalEarnings: Math.round((breakdown.company.netEarning + breakdown.marine.netEarning + breakdown.commercial.netEarning + breakdown.selling.netEarning) * 100) / 100,
  });
  console.log(`[v0] ========================================\n`);

  return {
    basePrice: Math.round(basePrice * 100) / 100,
    promotionApplied: Math.round(promotionValue * 100) / 100,
    breakdown,
    finalPrice: Math.round(currentPrice * 100) / 100,
    visiblePriceByRole: {
      company: Math.round(breakdown.company.visiblePrice * 100) / 100,
      marine: Math.round(breakdown.marine.visiblePrice * 100) / 100,
      commercial: Math.round(breakdown.commercial.visiblePrice * 100) / 100,
      selling: Math.round(breakdown.selling.visiblePrice * 100) / 100,
    },
  };
};

/**
 * Get visible price based on user role
 */
const getVisiblePrice = (pricingBreakdown, userLevel) => {
  const level = userLevel?.toLowerCase() || "company";
  return pricingBreakdown.visiblePriceByRole[level] || pricingBreakdown.finalPrice;
};

module.exports = {
  calculateHierarchicalPricing,
  getVisiblePrice,
  HIERARCHY_LEVELS,
  LAYER_NAMES,
};