const { MarkupDiscountRule } = require("../models/MarkupDiscountRule")

class MarkupDiscountRuleService {
  // Create a new rule
  async createRule(data) {
    const rule = new MarkupDiscountRule(data)
    return await rule.save()
  }

  // Get rule by ID
  async getRuleById(id) {
    return await MarkupDiscountRule.findById(id).populate("provider", "name").populate("partner", "name").lean()
  }

  // List rules with pagination and filters
  async listRules(query) {
    const {
      page = 1,
      limit = 10,
      q,
      provider,
      appliedToLayer,
      ruleType,
      status,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = query

    const filter = { isDeleted: false }

    if (q) {
      filter.$or = [{ ruleName: { $regex: q, $options: "i" } }]
    }

    if (provider) filter.provider = provider
    if (appliedToLayer) filter.appliedToLayer = appliedToLayer
    if (ruleType) filter.ruleType = ruleType
    if (status) filter.status = status

    const skip = (page - 1) * limit
    const sortObj = { [sortBy]: sortOrder === "asc" ? 1 : -1 }

    const [data, total] = await Promise.all([
      MarkupDiscountRule.find(filter)
        .populate("provider", "name")
        .populate("partner", "name")
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .lean(),
      MarkupDiscountRule.countDocuments(filter),
    ])

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    }
  }

  // Update rule
  async updateRule(id, data) {
    return await MarkupDiscountRule.findByIdAndUpdate(id, data, { new: true })
      .populate("provider", "name")
      .populate("partner", "name")
  }

  // Delete rule (soft delete)
  async deleteRule(id) {
    const result = await MarkupDiscountRule.findByIdAndUpdate(id, { isDeleted: true }, { new: true })
    return !!result
  }

  // Find applicable rules for a booking item
  async findApplicableRules(criteria) {
    const {
      serviceType,
      layer,
      partner,
      passengerType,
      cabinClass,
      cargoType,
      vehicleType,
      visaType,
      route,
      currentDate = new Date(),
    } = criteria

    const filter = {
      isDeleted: false,
      status: "Active",
      serviceTypes: serviceType,
      appliedToLayer: layer,
      effectiveDate: { $lte: currentDate },
      $or: [{ expiryDate: null }, { expiryDate: { $gte: currentDate } }],
    }

    // Match partner - either exact match or "All Child Partners" (partner = null)
    if (partner) {
      filter.$or = [{ partner: partner }, { partner: null }]
    } else {
      filter.partner = null
    }

    const rules = await MarkupDiscountRule.find(filter).lean()

    // Filter rules based on item conditions
    return rules.filter((rule) => {
      // Check passenger conditions
      if (serviceType === "Passenger") {
        if (rule.passengerTypes.length > 0 && !rule.passengerTypes.includes(passengerType)) return false
        if (rule.passengerCabins.length > 0 && !rule.passengerCabins.includes(cabinClass)) return false
      }

      // Check cargo conditions
      if (serviceType === "Cargo") {
        if (rule.cargoTypes.length > 0 && !rule.cargoTypes.includes(cargoType)) return false
      }

      // Check vehicle conditions
      if (serviceType === "Vehicle") {
        if (rule.vehicleTypes.length > 0 && !rule.vehicleTypes.includes(vehicleType)) return false
      }

      // Check visa type
      if (rule.visaType && rule.visaType !== visaType) return false

      // Check route
      if (rule.routes.length > 0) {
        const routeMatches = rule.routes.some((r) => r.from === route?.from && r.to === route?.to)
        if (!routeMatches) return false
      }

      return true
    })
  }

  // Apply rules to calculate final price and commission
  async applyRulesToItem(criteria) {
    const { basePrice, serviceType, layer, partner, item } = criteria

    const applicableRules = await this.findApplicableRules({
      serviceType,
      layer,
      partner,
      passengerType: item.passengerType,
      cabinClass: item.cabinClass,
      cargoType: item.cargoType,
      vehicleType: item.vehicleType,
      visaType: item.visaType,
      route: item.route,
    })

    let finalPrice = basePrice
    let totalCommission = 0
    const appliedRules = []

    for (const rule of applicableRules) {
      let adjustment = 0

      if (rule.valueType === "PERCENT") {
        adjustment = (basePrice * rule.value) / 100
      } else if (rule.valueType === "AMOUNT") {
        adjustment = rule.value
      }

      if (rule.ruleType === "Markup") {
        finalPrice += adjustment
      } else if (rule.ruleType === "Discount") {
        finalPrice -= adjustment
      }

      // Calculate commission
      const commission = (basePrice * rule.commissionValue) / 100

      totalCommission += commission

      appliedRules.push({
        ruleId: rule._id,
        ruleName: rule.ruleName,
        ruleType: rule.ruleType,
        value: rule.value,
        valueType: rule.valueType,
        adjustment,
        commission,
      })
    }

    return {
      basePrice,
      finalPrice: Math.max(0, finalPrice), // Ensure price doesn't go negative
      totalAdjustment: finalPrice - basePrice,
      totalCommission,
      appliedRules,
    }
  }
}

module.exports = new MarkupDiscountRuleService()
