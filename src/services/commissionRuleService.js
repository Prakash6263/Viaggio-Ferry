const { CommissionRule } = require("../models/CommissionRule")

class CommissionRuleService {
  // Create a new commission rule
  async createRule(data) {
    const rule = new CommissionRule(data)
    return await rule.save()
  }

  // Get rule by ID
  async getRuleById(id) {
    return await CommissionRule.findById(id).populate("provider", "name").populate("partner", "name").lean()
  }

  // List rules with pagination and filters
  async listRules(query) {
    const {
      page = 1,
      limit = 10,
      q,
      provider,
      appliedToLayer,
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
    if (status) filter.status = status

    const skip = (page - 1) * limit
    const sortObj = { [sortBy]: sortOrder === "asc" ? 1 : -1 }

    const [data, total] = await Promise.all([
      CommissionRule.find(filter)
        .populate("provider", "name")
        .populate("partner", "name")
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .lean(),
      CommissionRule.countDocuments(filter),
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
    return await CommissionRule.findByIdAndUpdate(id, data, { new: true })
      .populate("provider", "name")
      .populate("partner", "name")
  }

  // Delete rule (soft delete)
  async deleteRule(id) {
    const result = await CommissionRule.findByIdAndUpdate(id, { isDeleted: true }, { new: true })
    return !!result
  }

  // Find applicable commission rules for a booking item
  async findApplicableRules(criteria) {
    const { serviceType, layer, partner, visaType, route, currentDate = new Date() } = criteria

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

    const rules = await CommissionRule.find(filter).lean()

    // Filter rules based on conditions
    return rules.filter((rule) => {
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

  // Calculate commission distribution through hierarchy
  async calculateCommissionDistribution(criteria) {
    const { basePrice, serviceType, layer, partner, item } = criteria

    const applicableRules = await this.findApplicableRules({
      serviceType,
      layer,
      partner,
      visaType: item.visaType,
      route: item.route,
    })

    let totalCommission = 0
    const commissionDistribution = {}
    const appliedRules = []

    for (const rule of applicableRules) {
      const commission = (basePrice * rule.commissionValue) / 100
      totalCommission += commission

      // Distribute commission through the flow
      if (rule.commissionFlow && rule.commissionFlow.length > 0) {
        const commissionPerLayer = commission / rule.commissionFlow.length

        for (const flowLayer of rule.commissionFlow) {
          if (!commissionDistribution[flowLayer]) {
            commissionDistribution[flowLayer] = 0
          }
          commissionDistribution[flowLayer] += commissionPerLayer
        }
      }

      appliedRules.push({
        ruleId: rule._id,
        ruleName: rule.ruleName,
        commissionValue: rule.commissionValue,
        commission,
        commissionFlow: rule.commissionFlow,
      })
    }

    return {
      basePrice,
      totalCommission,
      commissionDistribution,
      appliedRules,
    }
  }
}

module.exports = new CommissionRuleService()
