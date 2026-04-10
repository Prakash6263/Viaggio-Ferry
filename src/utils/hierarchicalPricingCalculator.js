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
    partnerHierarchy,
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
    $or: [
  { expiryDate: null },
  { expiryDate: { $gte: currentDate } }
],
  };

  // COMPULSORY ROUTE MATCHING - must match (route, payload, cabin)
  // Handle both directions: some rules may have routes stored in reverse order
  const routeConditions = [
    {
      routes: {
        $elemMatch: {
          routeFrom: new mongoose.Types.ObjectId(originPort),
          routeTo: new mongoose.Types.ObjectId(destinationPort),
        },
      },
    },
    {
      routes: {
        $elemMatch: {
          routeFrom: new mongoose.Types.ObjectId(destinationPort),
          routeTo: new mongoose.Types.ObjectId(originPort),
        },
      },
    },
  ];

  // Build AND conditions array with all mandatory filters
  const andConditions = [
    {
      $or: routeConditions, // Routes must match (in either direction)
    },
  ];

  // Partner scope - if not company layer, filter by partner
if (layer !== "company" && partnerHierarchy?.length) {
  andConditions.push({
    $or: [
      {
        partnerScope: "AllChildPartners",
      },
      {
        partnerScope: "SpecificPartner",
        partner: {
          $in: partnerHierarchy.map(
            (id) => new mongoose.Types.ObjectId(id)
          ),
        },
      },
    ],
  });
}

  // Visa type filter - include rules that match visa type OR have null visa type (applies to all)
  if (visaType) {
    andConditions.push({
      $or: [
        { visaType: null },
        { visaType: visaType },
      ],
    });
  }

  // Apply all conditions via $and
  if (andConditions.length > 1) {
    query.$and = andConditions;
  } else {
    // Only route condition, apply directly
    query.$or = routeConditions;
  }

  console.log(`[v0] ${layer} MARKUP QUERY:`, JSON.stringify(query, null, 2));

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

  console.log(`[v0] Found ${rules.length} rules by route/status/dates for ${layer}. Now checking service details...`);

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

  console.log(`[v0] ${layer} - Found ${applicableRules.length} rules matching service details (payload+cabin)`);
  if (applicableRules.length > 0) {
    console.log(`[v0] ${layer} - Selected rule: "${applicableRules[0].ruleName}" (priority: ${applicableRules[0].priority})`);
  }

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
    partnerHierarchy,
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
    $or: [
  { expiryDate: null },
  { expiryDate: { $gte: currentDate } }
],
  };

  // COMPULSORY ROUTE MATCHING - must match (route, payload, cabin)
  // Handle both directions: some rules may have routes stored in reverse order
  const routeConditions = [
    {
      routes: {
        $elemMatch: {
          routeFrom: new mongoose.Types.ObjectId(originPort),
          routeTo: new mongoose.Types.ObjectId(destinationPort),
        },
      },
    },
    {
      routes: {
        $elemMatch: {
          routeFrom: new mongoose.Types.ObjectId(destinationPort),
          routeTo: new mongoose.Types.ObjectId(originPort),
        },
      },
    },
  ];

  // Build AND conditions array with all mandatory filters
  const andConditions = [
    {
      $or: routeConditions, // Routes must match (in either direction)
    },
  ];

  // Partner scope - if not company layer, filter by partner
 if (layer !== "company" && partnerHierarchy?.length) {
  andConditions.push({
    $or: [
      {
        partnerScope: "AllChildPartners",
      },
      {
        partnerScope: "SpecificPartner",
        partner: { $in: partnerHierarchy.map(id => new mongoose.Types.ObjectId(id)) },
      },
    ],
  });
}

  // Visa type filter - include rules that match visa type OR have null visa type (applies to all)
  if (visaType) {
    andConditions.push({
      $or: [
        { visaType: null },
        { visaType: visaType },
      ],
    });
  }

  // Apply all conditions via $and
  if (andConditions.length > 1) {
    query.$and = andConditions;
  } else {
    // Only route condition, apply directly
    query.$or = routeConditions;
  }

  console.log(`[v0] ${layer} COMMISSION QUERY:`, JSON.stringify(query, null, 2));

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

  console.log(`[v0] Found ${rules.length} commission rules by route/status/dates for ${layer}. Now checking service details...`);

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

  console.log(`[v0] ${layer} - Found ${applicableRules.length} commission rules matching service details (payload+cabin)`);
  if (applicableRules.length > 0) {
    console.log(`[v0] ${layer} - Selected commission rule: "${applicableRules[0].ruleName}" (priority: ${applicableRules[0].priority})`);
  }

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
     tripQuery.$or = [
  {
    routes: {
      $elemMatch: {
        routeFrom: originPort,
        routeTo: destinationPort,
      },
    },
  },
  {
    routes: {
      $elemMatch: {
        routeFrom: destinationPort,
        routeTo: originPort,
      },
    },
  },
];
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
  const service = promotion.servicePromotions?.[category];

  if (!service || !service.isEnabled) {
    return false;
  }

  // ✅ Passenger (needs payload + cabin)
  if (category === "passenger") {
    return service.eligibility?.some(
      (e) =>
        e.passengerTypeId?.toString() === payloadTypeId?.toString() &&
        e.cabinId?.toString() === cabinId?.toString()
    );
  }

  // ✅ Cargo
  if (category === "cargo") {
    return service.eligibility?.some(
      (e) =>
        e.payloadTypeId?.toString() === payloadTypeId?.toString()
    );
  }

  // ✅ Vehicle
  if (category === "vehicle") {
    return service.eligibility?.some(
      (e) =>
        e.payloadTypeId?.toString() === payloadTypeId?.toString()
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
    const servicePromo = promo.servicePromotions?.[category];
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
    partnerHierarchy,
    quantity,
    companyId,
    category,
    partnerId,
    visaType,
    originPort,
    destinationPort,
    payloadTypeId,
    cabinId,
    tripId,
  } = params;

  const breakdown = {};
  let currentPrice = basePrice;
  let promotionValue = 0;

  if (basePrice < 0) throw new Error("Base price cannot be negative");
  if (quantity < 1) throw new Error("Quantity must be at least 1");

  // 🔥 STEP 1: APPLY PROMOTION (ONLY ONCE - BEFORE ALL LAYERS)
  const promotionRule = await getPromotionRule({
    companyId,
    category,
    payloadTypeId,
    cabinId,
    originPort,
    destinationPort,
    tripId,
  });

  if (promotionRule) {
    const promoDiscount = calculatePromotionDiscount(
      [promotionRule],
      basePrice,
      quantity,
      category
    );

   promotionValue = Math.abs(promoDiscount); // ✅ FIX
currentPrice -= promotionValue;

    console.log("[v0] PROMOTION APPLIED:", {
      ruleName: promotionRule?.promotionName,
      discount: Math.round(promotionValue * 100) / 100,
      priceAfterPromotion: Math.round(currentPrice * 100) / 100,
    });
  } else {
    console.log("[v0] NO PROMOTION FOUND for:", {
      category,
      payloadTypeId,
      cabinId,
    });
  }

  console.log("[v0] ========== STARTING HIERARCHICAL PRICING ==========");
  console.log("[v0] Base Price:", basePrice);
  console.log("[v0] After Promotion:", Math.round(currentPrice * 100) / 100);

  // 🔁 STEP 2: APPLY ALL LAYERS
  for (const level of HIERARCHY_LEVELS) {
    console.log(`\n[v0] --- ${level.toUpperCase()} LAYER ---`);

    const markupDiscountRule = await getMarkupDiscountRule({
      companyId,
      partnerHierarchy,
      layer: level,
      category,
      partnerId: level !== "company" ? partnerId : null,
      visaType,
      originPort,
      destinationPort,
      payloadTypeId,
      cabinId,
    });

    const commissionRule = await getCommissionRule({
      companyId,
      partnerHierarchy,
      layer: level,
      category,
      partnerId: level !== "company" ? partnerId : null,
      visaType,
      originPort,
      destinationPort,
      payloadTypeId,
      cabinId,
    });

    const markupValue = markupDiscountRule
      ? calculateMarkupDiscount(markupDiscountRule, currentPrice)
      : 0;

    const priceAfterMarkup = currentPrice + markupValue;

    const commissionValue = commissionRule
      ? calculateCommission(commissionRule, priceAfterMarkup)
      : 0;

    const finalPrice = priceAfterMarkup - commissionValue;

    breakdown[level] = {
      basePrice: round(currentPrice),
      markup: round(markupValue),
      commission: round(commissionValue),
      promotion: round(promotionValue), // shown in all layers
      visiblePrice: round(priceAfterMarkup),
      finalPrice: round(finalPrice),
      netEarning: round(commissionValue),
    };

    console.log(`[v0] ${level} → Base: ${round(currentPrice)}`);
    console.log(`[v0] ${level} → Markup: ${round(markupValue)}`);
    console.log(`[v0] ${level} → Commission: ${round(commissionValue)}`);
    console.log(`[v0] ${level} → Final: ${round(finalPrice)}`);

    currentPrice = finalPrice;
  }

  console.log("\n[v0] FINAL PRICE:", round(currentPrice));

  return {
    basePrice: round(basePrice),
    promotionApplied: round(promotionValue),
    finalPrice: round(currentPrice),
    breakdown,
    visiblePriceByRole: {
      company: breakdown.company.visiblePrice,
      marine: breakdown.marine.visiblePrice,
      commercial: breakdown.commercial.visiblePrice,
      selling: breakdown.selling.visiblePrice,
    },
  };
};

// helper
function round(val) {
  return Math.round(val * 100) / 100;
}

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
