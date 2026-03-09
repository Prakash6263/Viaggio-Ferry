const createHttpError = require("http-errors")
const { MarkupDiscountRule } = require("../models/MarkupDiscountRule")

/**
 * POST /api/markup-discounts
 * Create a new markup/discount rule
 */
const createMarkupDiscountRule = async (req, res, next) => {
  try {
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
      serviceTypes,
      cabins,
      visaType,
      routeFrom,
      routeTo,
      effectiveDate,
      expiryDate,
      priority,
    } = req.body

    if (!companyId) throw createHttpError(400, "Company ID is required")

    // Validate required fields
    if (!ruleName || ruleName.trim().length === 0)
      throw createHttpError(400, "ruleName is required")
    if (!provider) throw createHttpError(400, "provider is required")
    if (!providerType) throw createHttpError(400, "providerType is required")
    if (!appliedLayer) throw createHttpError(400, "appliedLayer is required")
    if (!partnerScope) throw createHttpError(400, "partnerScope is required")
    if (!ruleType) throw createHttpError(400, "ruleType is required")
    if (ruleValue === undefined || ruleValue === null)
      throw createHttpError(400, "ruleValue is required")
    if (ruleValue < 0) throw createHttpError(400, "ruleValue must be positive")
    if (!valueType) throw createHttpError(400, "valueType is required")
    if (!serviceTypes || !Array.isArray(serviceTypes) || serviceTypes.length === 0)
      throw createHttpError(400, "serviceTypes is required (must be a non-empty array)")
    // Conditional cabin validation: required only for Passenger, empty for others
    if (serviceTypes.includes("Passenger")) {
      if (!cabins || !Array.isArray(cabins) || cabins.length === 0)
        throw createHttpError(400, "cabins is required when serviceTypes includes Passenger")
    } else if (cabins && Array.isArray(cabins) && cabins.length > 0) {
      throw createHttpError(400, "cabins must be empty when serviceTypes only includes Cargo and/or Vehicle")
    }
    if (!routeFrom) throw createHttpError(400, "routeFrom is required")
    if (!routeTo) throw createHttpError(400, "routeTo is required")
    if (!effectiveDate) throw createHttpError(400, "effectiveDate is required")

    // For specific partner scope, partner is required
    if (partnerScope === "SpecificPartner" && !partner) {
      throw createHttpError(400, "partner is required when partnerScope is SpecificPartner")
    }

    // Set provider fields based on providerType
    let providerCompany = null
    let providerPartner = null

    if (providerType === "Company") {
      providerCompany = companyId
    } else if (providerType === "Partner") {
      providerPartner = provider
    }

    // Check for duplicate rules before creating
    const duplicateRule = await MarkupDiscountRule.findOne({
      company: companyId,
      providerType,
      providerCompany,
      providerPartner,
      appliedLayer,
      partnerScope,
      partner: partnerScope === "SpecificPartner" ? partner : null,
      serviceTypes: { $all: serviceTypes },
      cabins: { $all: cabins || [] },
      routeFrom,
      routeTo,
      visaType: visaType || null,
      isDeleted: false,
    })

    if (duplicateRule) {
      throw createHttpError(400, "Duplicate rule already exists for this configuration")
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
      serviceTypes,
      cabins,
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
    const populatedRule = await MarkupDiscountRule.findById(rule._id)
      .populate("providerCompany", "companyName")
      .populate("providerPartner", "name partnerName")
      .populate("partner", "name partnerName")
      .populate("cabins", "name type")
      .populate("routeFrom", "portName")
      .populate("routeTo", "portName")
      .populate("createdBy", "email name")
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
 */
const listMarkupDiscountRules = async (req, res, next) => {
  try {
    const { companyId } = req
    const {
      page = 1,
      limit = 10,
      search,
      layer,
      routeFrom,
      serviceType,
      cabin,
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

    if (serviceType) {
      filter.serviceTypes = { $in: [serviceType] }
    }

    if (cabin) {
      filter.cabins = { $in: [cabin] }
    }

    if (ruleType) {
      filter.ruleType = ruleType
    }

    const rules = await MarkupDiscountRule.find(filter)
      .populate("providerCompany", "companyName")
      .populate("providerPartner", "name partnerName")
      .populate("partner", "name partnerName")
      .populate("cabins", "name type")
      .populate("routeFrom", "portName")
      .populate("routeTo", "portName")
      .populate("createdBy", "email name")
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
      .populate("providerCompany", "companyName")
      .populate("providerPartner", "name partnerName")
      .populate("partner", "name partnerName")
      .populate("cabins", "name type")
      .populate("routeFrom", "portName")
      .populate("routeTo", "portName")
      .populate("createdBy", "email name")
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
      serviceTypes,
      cabins,
      visaType,
      routeFrom,
      routeTo,
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
    if (serviceTypes !== undefined) {
      if (!Array.isArray(serviceTypes) || serviceTypes.length === 0)
        throw createHttpError(400, "serviceTypes must be a non-empty array")
      rule.serviceTypes = serviceTypes
    }

    if (cabins !== undefined) {
      // Conditional cabin validation
      if (serviceTypes && serviceTypes.includes("Passenger")) {
        if (!Array.isArray(cabins) || cabins.length === 0)
          throw createHttpError(400, "cabins must be provided when serviceTypes includes Passenger")
        rule.cabins = cabins
      } else if (rule.serviceTypes && rule.serviceTypes.includes("Passenger")) {
        if (!Array.isArray(cabins) || cabins.length === 0)
          throw createHttpError(400, "cabins must be provided when serviceTypes includes Passenger")
        rule.cabins = cabins
      } else if (Array.isArray(cabins) && cabins.length > 0) {
        throw createHttpError(400, "cabins must be empty when serviceTypes only includes Cargo and/or Vehicle")
      } else {
        rule.cabins = cabins || []
      }
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

    const populatedRule = await MarkupDiscountRule.findById(rule._id)
      .populate("providerCompany", "companyName")
      .populate("providerPartner", "name partnerName")
      .populate("partner", "name partnerName")
      .populate("cabins", "name type")
      .populate("routeFrom", "portName")
      .populate("routeTo", "portName")
      .populate("createdBy", "email name")
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

module.exports = {
  createMarkupDiscountRule,
  listMarkupDiscountRules,
  getMarkupDiscountRule,
  updateMarkupDiscountRule,
  deleteMarkupDiscountRule,
}
