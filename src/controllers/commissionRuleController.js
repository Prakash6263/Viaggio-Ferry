const createHttpError = require("http-errors")
const { CommissionRule } = require("../models/CommissionRule")

/**
 * POST /api/commission-rules
 * Create a new commission rule
 */
const createCommissionRule = async (req, res, next) => {
  try {
    const { companyId, userId } = req
    const {
      ruleName,
      provider,
      providerType,
      appliedLayer,
      partnerScope,
      partner,
      commissionType,
      commissionValue,
      serviceDetails,
      visaType,
      routeFrom,
      routeTo,
      effectiveDate,
      expiryDate,
      priority,
    } = req.body

    if (!companyId) throw createHttpError(400, "Company ID is required")

    // Set provider fields based on providerType
    let providerCompany = null
    let providerPartner = null

    if (providerType === "Company") {
      providerCompany = companyId
    } else if (providerType === "Partner") {
      providerPartner = provider
    }

    // Check for duplicate rules before creating
    const duplicateRule = await CommissionRule.findOne({
      company: companyId,
      providerType,
      providerCompany,
      providerPartner,
      appliedLayer,
      partnerScope,
      partner: partnerScope === "SpecificPartner" ? partner : null,
      routeFrom,
      routeTo,
      visaType: visaType || null,
      isDeleted: false,
    })

    if (duplicateRule) {
      throw createHttpError(400, "Duplicate rule already exists for this configuration")
    }

    const rule = new CommissionRule({
      company: companyId,
      ruleName: ruleName.trim(),
      providerType,
      providerCompany,
      providerPartner,
      appliedLayer,
      partnerScope,
      partner: partnerScope === "SpecificPartner" ? partner : null,
      commissionType,
      commissionValue,
      serviceDetails,
      visaType: visaType || null,
      routeFrom,
      routeTo,
      effectiveDate: new Date(effectiveDate),
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      priority: priority || 1,
      isActive: true,
      createdBy: userId,
    })

    await rule.save()

    // Populate references for response
    const populatedRule = await CommissionRule.findById(rule._id)
      .populate("providerCompany", "companyName")
      .populate("providerPartner", "name partnerName")
      .populate("partner", "name partnerName")
      .populate("routeFrom", "portName")
      .populate("routeTo", "portName")
      .populate("createdBy", "email name")
      .lean()

    res.status(201).json({
      success: true,
      message: "Commission rule created successfully",
      data: populatedRule,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * GET /api/commission-rules
 * List all commission rules for the company
 */
const listCommissionRules = async (req, res, next) => {
  try {
    const { companyId } = req
    const {
      page = 1,
      limit = 10,
      search,
      layer,
      routeFrom,
      partnerScope,
    } = req.query

    if (!companyId) throw createHttpError(400, "Company ID is required")

    const skip = (page - 1) * limit
    const filter = {
      company: companyId,
      isDeleted: false,
    }

    console.log("[v0] Debug - companyId from req:", companyId)
    console.log("[v0] Debug - Filter before queries:", filter)

    // Check what's in database
    const allRules = await CommissionRule.find({ company: companyId }).lean()
    console.log("[v0] Debug - All rules for company:", allRules.length)

    // Apply filters
    if (search && search.trim().length > 0) {
      filter.ruleName = { $regex: search.trim(), $options: "i" }
    }

    if (layer) {
      filter.appliedLayer = layer
    }

    if (routeFrom) {
      filter.routeFrom = routeFrom
    }

    if (partnerScope) {
      filter.partnerScope = partnerScope
    }

    console.log("[v0] Debug - Final filter:", JSON.stringify(filter))

    const rules = await CommissionRule.find(filter)
      .populate("providerCompany", "companyName")
      .populate("providerPartner", "name partnerName")
      .populate("partner", "name partnerName")
      .populate("routeFrom", "portName")
      .populate("routeTo", "portName")
      .populate("createdBy", "email name")
      .skip(skip)
      .limit(Number.parseInt(limit))
      .sort({ priority: -1, effectiveDate: -1 })
      .lean()

    const total = await CommissionRule.countDocuments(filter)

    res.json({
      success: true,
      data: rules,
      pagination: {
        page: Number.parseInt(page),
        limit: Number.parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    next(error)
  }
}

/**
 * GET /api/commission-rules/:id
 * Get a specific commission rule
 */
const getCommissionRule = async (req, res, next) => {
  try {
    const { id } = req.params
    const { companyId } = req

    if (!companyId) throw createHttpError(400, "Company ID is required")

    const rule = await CommissionRule.findOne({
      _id: id,
      company: companyId,
      isActive: true,
      isDeleted: false,
    })
      .populate("providerCompany", "companyName")
      .populate("providerPartner", "name partnerName")
      .populate("partner", "name partnerName")
      .populate("routeFrom", "portName")
      .populate("routeTo", "portName")
      .populate("createdBy", "email name")
      .populate("updatedBy", "email name")
      .lean()

    if (!rule) {
      throw createHttpError(404, "Commission rule not found")
    }

    res.json({
      success: true,
      data: rule,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * PUT /api/commission-rules/:id
 * Update a commission rule
 */
const updateCommissionRule = async (req, res, next) => {
  try {
    const { id } = req.params
    const { companyId, userId } = req
    const {
      ruleName,
      provider,
      providerType,
      appliedLayer,
      partnerScope,
      partner,
      commissionType,
      commissionValue,
      serviceDetails,
      visaType,
      routeFrom,
      routeTo,
      effectiveDate,
      expiryDate,
      priority,
      isActive,
    } = req.body

    if (!companyId) throw createHttpError(400, "Company ID is required")

    const rule = await CommissionRule.findOne({
      _id: id,
      company: companyId,
    })

    if (!rule) {
      throw createHttpError(404, "Commission rule not found")
    }

    // Update fields if provided
    if (ruleName !== undefined) {
      if (ruleName.trim().length === 0)
        throw createHttpError(400, "ruleName cannot be empty")
      rule.ruleName = ruleName.trim()
    }

    if (provider !== undefined || providerType !== undefined) {
      const newProviderType = providerType !== undefined ? providerType : rule.providerType
      const newProvider = provider !== undefined ? provider : (rule.providerType === "Company" ? rule.providerCompany : rule.providerPartner)

      if (newProviderType === "Company") {
        rule.providerCompany = companyId
        rule.providerPartner = null
      } else if (newProviderType === "Partner") {
        rule.providerPartner = newProvider
        rule.providerCompany = null
      }
      rule.providerType = newProviderType
    }

    if (appliedLayer !== undefined) rule.appliedLayer = appliedLayer
    if (partnerScope !== undefined) {
      rule.partnerScope = partnerScope
      if (partnerScope === "SpecificPartner" && !partner) {
        throw createHttpError(400, "partner is required when partnerScope is SpecificPartner")
      }
      rule.partner = partnerScope === "SpecificPartner" ? partner : null
    }

    if (partner !== undefined && rule.partnerScope === "SpecificPartner") {
      rule.partner = partner
    }

    if (commissionType !== undefined) rule.commissionType = commissionType
    if (commissionValue !== undefined) {
      if (commissionValue < 0) throw createHttpError(400, "commissionValue must be positive")
      rule.commissionValue = commissionValue
    }

    if (serviceDetails !== undefined) {
      rule.serviceDetails = serviceDetails
    }

    if (visaType !== undefined) rule.visaType = visaType || null
    if (routeFrom !== undefined) rule.routeFrom = routeFrom
    if (routeTo !== undefined) rule.routeTo = routeTo
    if (effectiveDate !== undefined) rule.effectiveDate = new Date(effectiveDate)
    if (expiryDate !== undefined) rule.expiryDate = expiryDate ? new Date(expiryDate) : null
    if (priority !== undefined) rule.priority = priority
    if (isActive !== undefined) rule.isActive = isActive

    rule.updatedBy = userId
    await rule.save()

    const populatedRule = await CommissionRule.findById(rule._id)
      .populate("providerCompany", "companyName")
      .populate("providerPartner", "name partnerName")
      .populate("partner", "name partnerName")
      .populate("routeFrom", "portName")
      .populate("routeTo", "portName")
      .populate("createdBy", "email name")
      .populate("updatedBy", "email name")
      .lean()

    res.json({
      success: true,
      message: "Commission rule updated successfully",
      data: populatedRule,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * DELETE /api/commission-rules/:id
 * Soft delete a commission rule
 */
const deleteCommissionRule = async (req, res, next) => {
  try {
    const { id } = req.params
    const { companyId } = req

    if (!companyId) throw createHttpError(400, "Company ID is required")

    const rule = await CommissionRule.findOne({
      _id: id,
      company: companyId,
    })

    if (!rule) {
      throw createHttpError(404, "Commission rule not found")
    }

    // Soft delete
    rule.isActive = false
    rule.isDeleted = true
    await rule.save()

    res.json({
      success: true,
      message: "Commission rule deleted successfully",
    })
  } catch (error) {
    next(error)
  }
}

/**
 * PATCH /api/commission-rules/:id/activate
 * Activate an inactive commission rule
 */
const activateCommissionRule = async (req, res, next) => {
  try {
    const { id } = req.params
    const { companyId, userId } = req

    if (!companyId) throw createHttpError(400, "Company ID is required")

    const rule = await CommissionRule.findOne({
      _id: id,
      company: companyId,
      isDeleted: false,
    })

    if (!rule) {
      throw createHttpError(404, "Commission rule not found")
    }

    if (rule.isActive) {
      throw createHttpError(400, "Commission rule is already active")
    }

    rule.isActive = true
    rule.status = "Active"
    rule.updatedBy = userId
    await rule.save()

    const populatedRule = await CommissionRule.findById(rule._id)
      .populate("providerCompany", "companyName")
      .populate("providerPartner", "name partnerName")
      .populate("partner", "name partnerName")
      .populate("routeFrom", "portName")
      .populate("routeTo", "portName")
      .populate("createdBy", "email name")
      .populate("updatedBy", "email name")
      .lean()

    res.json({
      success: true,
      message: "Commission rule activated successfully",
      data: populatedRule,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * GET /api/commission-rules/history
 * Get history of commission rule actions
 */
const getCommissionHistory = async (req, res, next) => {
  try {
    const { companyId } = req
    const { ruleId, actionType, dateRange = "last7days" } = req.query

    if (!companyId) throw createHttpError(400, "Company ID is required")

    const filter = { company: companyId, isDeleted: false }

    if (ruleId) {
      filter._id = ruleId
    }

    // Build date range filter
    let dateStart = new Date()
    if (dateRange === "last7days") {
      dateStart.setDate(dateStart.getDate() - 7)
    } else if (dateRange === "last30days") {
      dateStart.setDate(dateStart.getDate() - 30)
    } else if (dateRange === "last90days") {
      dateStart.setDate(dateStart.getDate() - 90)
    }

    const rules = await CommissionRule.find(filter)
      .populate("createdBy", "email name")
      .populate("updatedBy", "email name")
      .lean()

    // Construct history from rules
    const history = []

    for (const rule of rules) {
      // Created action
      if (rule.createdAt >= dateStart) {
        history.push({
          ruleId: rule._id,
          ruleName: rule.ruleName,
          actionType: "Created",
          title: `Commission rule created`,
          description: `Commission rule "${rule.ruleName}" was created for ${rule.providerType === "Company" ? "Company" : "Partner"} provider on layer ${rule.appliedLayer}`,
          createdBy: rule.createdBy,
          createdAt: rule.createdAt,
        })
      }

      // Updated action (if different from created)
      if (
        rule.updatedAt &&
        rule.updatedAt !== rule.createdAt &&
        rule.updatedAt >= dateStart
      ) {
        history.push({
          ruleId: rule._id,
          ruleName: rule.ruleName,
          actionType: "Updated",
          title: `Commission rule updated`,
          description: `Commission rule "${rule.ruleName}" was updated`,
          createdBy: rule.updatedBy,
          createdAt: rule.updatedAt,
        })
      }

      // Deleted action
      if (rule.isDeleted && rule.updatedAt >= dateStart) {
        history.push({
          ruleId: rule._id,
          ruleName: rule.ruleName,
          actionType: "Deleted",
          title: `Commission rule deleted`,
          description: `Commission rule "${rule.ruleName}" was deleted`,
          createdBy: rule.updatedBy,
          createdAt: rule.updatedAt,
        })
      }
    }

    // Filter by actionType if provided
    let filteredHistory = history
    if (actionType) {
      filteredHistory = history.filter((h) => h.actionType === actionType)
    }

    // Sort by date (newest first)
    filteredHistory.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

    res.json({
      success: true,
      data: filteredHistory,
    })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  createCommissionRule,
  listCommissionRules,
  getCommissionRule,
  updateCommissionRule,
  deleteCommissionRule,
  activateCommissionRule,
  getCommissionHistory,
}
