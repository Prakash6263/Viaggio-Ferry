const createHttpError = require("http-errors")
const { MarkupDiscountRule } = require("../models/MarkupDiscountRule")

/**
 * POST /api/markup-discounts
 * Create a new markup/discount rule
 */
const createMarkupDiscountRule = async (req, res, next) => {
  try {
    const { companyId, userId, user, agent } = req
    const {
      ruleName,
      appliedLayer,
      partnerScope,
      partner,
      ruleType,
      ruleValue,
      valueType,
      serviceDetails,
      visaType,
      routes,
      effectiveDate,
      expiryDate,
      priority,
    } = req.body

    if (!companyId) throw createHttpError(400, "Company ID is required")

    // Derive providerType, providerCompany, providerPartner entirely from token — never trust frontend
    // - role "company": providerType = "Company", providerCompany = companyId, providerPartner = null
    // - role "user" with agent: providerType = "Partner", providerCompany = companyId, providerPartner = agent
    let providerType
    let providerCompany = companyId   // always set to the company
    let providerPartner = null

    if (user?.role === "user" && agent) {
      providerType = "Partner"
      providerPartner = agent
    } else {
      providerType = "Company"
    }

    // Validate required fields (Mandatory: Rule Name, Rule Type, Provider, Applied to Layer, Partner, Commission Value, Effective Date, Expiry Date, at least one service type)
    if (!ruleName || ruleName.trim().length === 0)
      throw createHttpError(400, "ruleName is required")
    if (!ruleType) throw createHttpError(400, "ruleType is required")
    if (!appliedLayer) throw createHttpError(400, "appliedLayer is required")
    if (ruleValue === undefined || ruleValue === null)
      throw createHttpError(400, "ruleValue (Commission Value) is required")
    if (ruleValue < 0) throw createHttpError(400, "ruleValue must be positive")
    if (!effectiveDate) throw createHttpError(400, "effectiveDate is required")
    if (!expiryDate) throw createHttpError(400, "expiryDate is required")
    
    // serviceDetails is optional - validate only if provided

    // For specific partner scope, partner is required
    if (partnerScope === "SpecificPartner" && !partner) {
      throw createHttpError(400, "partner is required when partnerScope is SpecificPartner")
    }

    // Check for duplicate rules before creating
    // Duplicate check: same company, provider, layer, and any overlapping routes (if routes provided)
    const duplicateQuery = {
      company: companyId,
      providerCompany,
      providerPartner,
      appliedLayer,
      partnerScope,
      partner: partnerScope === "SpecificPartner" ? partner : null,
      visaType: visaType || null,
      isDeleted: false,
    }

    // Filter out empty/invalid routes before processing
    // This prevents BSONError when empty strings are passed for routeFrom/routeTo
    const validRoutes = routes && Array.isArray(routes) 
      ? routes.filter(r => r && r.routeFrom && r.routeTo && r.routeFrom.trim() !== "" && r.routeTo.trim() !== "")
      : []

    // Only add route filters if valid routes are provided
    if (validRoutes.length > 0) {
      duplicateQuery["routes.routeFrom"] = { $in: validRoutes.map(r => r.routeFrom) }
      duplicateQuery["routes.routeTo"] = { $in: validRoutes.map(r => r.routeTo) }
    }

    const duplicateRule = await MarkupDiscountRule.findOne(duplicateQuery)

    if (duplicateRule) {
      throw createHttpError(400, "Duplicate rule already exists with similar criteria")
    }

    const rule = new MarkupDiscountRule({
      company: companyId,
      ruleName: ruleName.trim(),
      providerType,
      providerCompany,
      providerPartner,
      appliedLayer,
      partnerScope,
      partner: partnerScope === "SpecificPartner" ? partner : null,
      ruleType,
      ruleValue,
      valueType,
      serviceDetails,
      visaType: visaType || null,
      routes: validRoutes,
      effectiveDate: new Date(effectiveDate),
      expiryDate: new Date(expiryDate),
      priority: priority || 1,
      isActive: true,
      createdBy: userId,
    })

    await rule.save()

    // Populate references for response
    const populatedRule = await MarkupDiscountRule.findById(rule._id)
      .populate("company", "companyName")
      .populate("providerCompany", "companyName")
      .populate("providerPartner", "name partnerName")
      .populate("partner", "name partnerName")
      .populate({
        path: "routes.routeFrom",
        select: "portName code country",
      })
      .populate({
        path: "routes.routeTo",
        select: "portName code country",
      })
      .populate({
        path: "serviceDetails.passenger.cabinId",
        select: "name type description",
      })
      .populate({
        path: "serviceDetails.passenger.payloadTypeId",
        select: "name code category",
      })
      .populate({
        path: "serviceDetails.cargo.cabinId",
        select: "name type description",
      })
      .populate({
        path: "serviceDetails.cargo.payloadTypeId",
        select: "name code category",
      })
      .populate({
        path: "serviceDetails.vehicle.cabinId",
        select: "name type description",
      })
      .populate({
        path: "serviceDetails.vehicle.payloadTypeId",
        select: "name code category",
      })
      .populate("createdBy", "email name")
      .populate("updatedBy", "email name")
      .lean()

    res.status(201).json({
      success: true,
      message: "Markup/Discount rule created successfully",
      data: populatedRule,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * GET /api/markup-discounts
 * List all markup/discount rules for the company
 * - If role is "company", show all rules for that company
 * - If role is "user", show only rules created by the user's connected partner/agent
 */
const listMarkupDiscountRules = async (req, res, next) => {
  try {
    const { companyId, user, agent } = req
    const {
      page = 1,
      limit = 10,
      search,
      layer,
      routeFrom,
      routeTo,
      ruleType,
    } = req.query

    if (!companyId) throw createHttpError(400, "Company ID is required")

    const skip = (page - 1) * limit
    const filter = {
      company: companyId,
      isActive: true,
      isDeleted: false,
      $or: [{ expiryDate: null }, { expiryDate: { $gte: new Date() } }],
    }

    // Filter by role: if user role is "user", only show rules created by their connected partner/agent
    // If role is "company", show all rules for the company
    if (user?.role === "user" && agent) {
      // User is connected to a partner/agent - only show their rules
      filter.providerPartner = agent
    }
    // If role is "company" or no agent, show all company rules (default behavior)

    // Apply filters
    if (search && search.trim().length > 0) {
      filter.ruleName = { $regex: search.trim(), $options: "i" }
    }

    if (layer) {
      filter.appliedLayer = layer
    }

    // Filter by routes - can search by routeFrom or routeTo
    if (routeFrom || routeTo) {
      const routeFilter = {}
      if (routeFrom) {
        routeFilter["routes.routeFrom"] = routeFrom
      }
      if (routeTo) {
        routeFilter["routes.routeTo"] = routeTo
      }
      // Merge route filter with main filter
      if (routeFrom && routeTo) {
        filter.$and = [
          { "routes.routeFrom": routeFrom },
          { "routes.routeTo": routeTo },
        ]
      } else {
        Object.assign(filter, routeFilter)
      }
    }

    if (ruleType) {
      filter.ruleType = ruleType
    }

    const rules = await MarkupDiscountRule.find(filter)
      .populate("company", "companyName")
      .populate("providerCompany", "companyName")
      .populate("providerPartner", "name partnerName")
      .populate("partner", "name partnerName")
      .populate({
        path: "routes.routeFrom",
        select: "portName code country",
      })
      .populate({
        path: "routes.routeTo",
        select: "portName code country",
      })
      .populate({
        path: "serviceDetails.passenger.cabinId",
        select: "name type description",
      })
      .populate({
        path: "serviceDetails.passenger.payloadTypeId",
        select: "name code category",
      })
      .populate({
        path: "serviceDetails.cargo.cabinId",
        select: "name type description",
      })
      .populate({
        path: "serviceDetails.cargo.payloadTypeId",
        select: "name code category",
      })
      .populate({
        path: "serviceDetails.vehicle.cabinId",
        select: "name type description",
      })
      .populate({
        path: "serviceDetails.vehicle.payloadTypeId",
        select: "name code category",
      })
      .populate("createdBy", "email name")
      .populate("updatedBy", "email name")
      .skip(skip)
      .limit(Number.parseInt(limit))
      .sort({ priority: -1, effectiveDate: -1 })
      .lean()

    const total = await MarkupDiscountRule.countDocuments(filter)

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
 * GET /api/markup-discounts/:id
 * Get a specific markup/discount rule
 */
const getMarkupDiscountRule = async (req, res, next) => {
  try {
    const { id } = req.params
    const { companyId } = req

    if (!companyId) throw createHttpError(400, "Company ID is required")

    const rule = await MarkupDiscountRule.findOne({
      _id: id,
      company: companyId,
      isActive: true,
      isDeleted: false,
    })
      .populate("company", "companyName")
      .populate("providerCompany", "companyName")
      .populate("providerPartner", "name partnerName")
      .populate("partner", "name partnerName")
      .populate({
        path: "routes.routeFrom",
        select: "portName code country",
      })
      .populate({
        path: "routes.routeTo",
        select: "portName code country",
      })
      .populate({
        path: "serviceDetails.passenger.cabinId",
        select: "name type description",
      })
      .populate({
        path: "serviceDetails.passenger.payloadTypeId",
        select: "name code category",
      })
      .populate({
        path: "serviceDetails.cargo.cabinId",
        select: "name type description",
      })
      .populate({
        path: "serviceDetails.cargo.payloadTypeId",
        select: "name code category",
      })
      .populate({
        path: "serviceDetails.vehicle.cabinId",
        select: "name type description",
      })
      .populate({
        path: "serviceDetails.vehicle.payloadTypeId",
        select: "name code category",
      })
      .populate("createdBy", "email name")
      .populate("updatedBy", "email name")
      .lean()

    if (!rule) {
      throw createHttpError(404, "Markup/Discount rule not found")
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
 * PUT /api/markup-discounts/:id
 * Update a markup/discount rule
 */
const updateMarkupDiscountRule = async (req, res, next) => {
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
      ruleType,
      ruleValue,
      valueType,
      serviceDetails,
      visaType,
      routes,
      effectiveDate,
      expiryDate,
      priority,
      isActive,
    } = req.body

    if (!companyId) throw createHttpError(400, "Company ID is required")

    const rule = await MarkupDiscountRule.findOne({
      _id: id,
      company: companyId,
    })

    if (!rule) {
      throw createHttpError(404, "Markup/Discount rule not found")
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

    if (ruleType !== undefined) rule.ruleType = ruleType
    if (ruleValue !== undefined) {
      if (ruleValue < 0) throw createHttpError(400, "ruleValue must be positive")
      rule.ruleValue = ruleValue
    }

    if (valueType !== undefined) rule.valueType = valueType
    if (serviceDetails !== undefined) {
      rule.serviceDetails = serviceDetails
    }

    if (visaType !== undefined) rule.visaType = visaType || null
    
    // Handle routes array update (routes are optional)
    if (routes !== undefined) {
      if (routes === null || (Array.isArray(routes) && routes.length === 0)) {
        // Allow clearing routes - set to empty array
        rule.routes = []
      } else if (Array.isArray(routes)) {
        // Filter out empty/invalid routes to prevent BSONError
        const validRoutes = routes.filter(r => r && r.routeFrom && r.routeTo && r.routeFrom.trim() !== "" && r.routeTo.trim() !== "")
        
        // Validate each valid route
        validRoutes.forEach((route, index) => {
          if (route.routeFrom === route.routeTo) {
            throw createHttpError(400, `Route ${index + 1}: routeFrom and routeTo must be different ports`)
          }
        })
        rule.routes = validRoutes
      }
    }
    
    if (effectiveDate !== undefined) rule.effectiveDate = new Date(effectiveDate)
    if (expiryDate !== undefined) {
      if (!expiryDate) {
        throw createHttpError(400, "expiryDate cannot be empty or null")
      }
      rule.expiryDate = new Date(expiryDate)
    }
    if (priority !== undefined) rule.priority = priority
    if (isActive !== undefined) rule.isActive = isActive

    rule.updatedBy = userId
    await rule.save()

    const populatedRule = await MarkupDiscountRule.findById(rule._id)
      .populate("company", "companyName")
      .populate("providerCompany", "companyName")
      .populate("providerPartner", "name partnerName")
      .populate("partner", "name partnerName")
      .populate({
        path: "routes.routeFrom",
        select: "portName code country",
      })
      .populate({
        path: "routes.routeTo",
        select: "portName code country",
      })
      .populate({
        path: "serviceDetails.passenger.cabinId",
        select: "name type description",
      })
      .populate({
        path: "serviceDetails.passenger.payloadTypeId",
        select: "name code category",
      })
      .populate({
        path: "serviceDetails.cargo.cabinId",
        select: "name type description",
      })
      .populate({
        path: "serviceDetails.cargo.payloadTypeId",
        select: "name code category",
      })
      .populate({
        path: "serviceDetails.vehicle.cabinId",
        select: "name type description",
      })
      .populate({
        path: "serviceDetails.vehicle.payloadTypeId",
        select: "name code category",
      })
      .populate("createdBy", "email name")
      .populate("updatedBy", "email name")
      .lean()

    res.json({
      success: true,
      message: "Markup/Discount rule updated successfully",
      data: populatedRule,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * DELETE /api/markup-discounts/:id
 * Soft delete a markup/discount rule
 */
const deleteMarkupDiscountRule = async (req, res, next) => {
  try {
    const { id } = req.params
    const { companyId } = req

    if (!companyId) throw createHttpError(400, "Company ID is required")

    const rule = await MarkupDiscountRule.findOne({
      _id: id,
      company: companyId,
    })

    if (!rule) {
      throw createHttpError(404, "Markup/Discount rule not found")
    }

    // Soft delete
    rule.isActive = false
    rule.isDeleted = true
    await rule.save()

    res.json({
      success: true,
      message: "Markup/Discount rule deleted successfully",
    })
  } catch (error) {
    next(error)
  }
}

/**
 * GET /api/markup-discounts/history
 * Get history of markup/discount rule actions
 */
const getMarkupDiscountHistory = async (req, res, next) => {
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

    const rules = await MarkupDiscountRule.find(filter)
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
          title: `Markup/Discount rule created`,
          description: `Markup/Discount rule "${rule.ruleName}" was created for ${rule.providerType === "Company" ? "Company" : "Partner"} provider on layer ${rule.appliedLayer}`,
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
          title: `Markup/Discount rule updated`,
          description: `Markup/Discount rule "${rule.ruleName}" was updated`,
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
          title: `Markup/Discount rule deleted`,
          description: `Markup/Discount rule "${rule.ruleName}" was deleted`,
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
  createMarkupDiscountRule,
  listMarkupDiscountRules,
  getMarkupDiscountRule,
  updateMarkupDiscountRule,
  deleteMarkupDiscountRule,
  getMarkupDiscountHistory,
}
