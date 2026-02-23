const createHttpError = require("http-errors")
const { TicketingRule, RULE_TYPES, PAYLOAD_TYPES, FEE_TYPES } = require("../models/TicketingRule")

// POST /api/ticketing-rules
const createTicketingRule = async (req, res, next) => {
  try {
    const { companyId, userId } = req
    const {
      ruleType,
      ruleName,
      payloadType = "ALL",
      sameDayOnly = false,
      startOffsetDays = 0,
      restrictedWindowHours,
      normalFeeType,
      normalFeeValue,
      restrictedPenalty,
      taxRefundable = false,
      commissionReversal = true,
    } = req.body

    // Validation
    if (!companyId) throw createHttpError(400, "Company ID is required")
    if (!ruleType || !RULE_TYPES.includes(ruleType))
      throw createHttpError(400, `Invalid ruleType. Must be one of: ${RULE_TYPES.join(", ")}`)
    if (!ruleName || ruleName.trim().length === 0)
      throw createHttpError(400, "ruleName is required")
    if (payloadType && !PAYLOAD_TYPES.includes(payloadType))
      throw createHttpError(400, `Invalid payloadType. Must be one of: ${PAYLOAD_TYPES.join(", ")}`)
    if (restrictedWindowHours === undefined || restrictedWindowHours === null)
      throw createHttpError(400, "restrictedWindowHours is required")
    if (typeof restrictedWindowHours !== "number" || restrictedWindowHours < 0)
      throw createHttpError(400, "restrictedWindowHours must be a non-negative number")
    if (!restrictedPenalty || !restrictedPenalty.feeType || restrictedPenalty.feeValue === undefined)
      throw createHttpError(400, "restrictedPenalty with feeType and feeValue is required")
    if (!FEE_TYPES.includes(restrictedPenalty.feeType))
      throw createHttpError(400, `Invalid restrictedPenalty.feeType. Must be one of: ${FEE_TYPES.join(", ")}`)
    if (typeof restrictedPenalty.feeValue !== "number" || restrictedPenalty.feeValue < 0)
      throw createHttpError(400, "restrictedPenalty.feeValue must be a non-negative number")

    // Validate normalFee if provided
    if (normalFeeType && !FEE_TYPES.includes(normalFeeType))
      throw createHttpError(400, `Invalid normalFeeType. Must be one of: ${FEE_TYPES.join(", ")}`)
    if ((normalFeeType && normalFeeValue === undefined) || (normalFeeValue !== undefined && typeof normalFeeValue !== "number"))
      throw createHttpError(400, "normalFeeValue must be a number when normalFeeType is provided")

    const rule = new TicketingRule({
      company: companyId,
      ruleType,
      ruleName: ruleName.trim(),
      payloadType,
      sameDayOnly,
      startOffsetDays: Math.max(0, Math.floor(startOffsetDays)),
      restrictedWindowHours,
      normalFeeType: normalFeeType || null,
      normalFeeValue: normalFeeValue !== undefined ? normalFeeValue : null,
      restrictedPenalty,
      taxRefundable,
      commissionReversal,
      createdBy: userId,
      updatedBy: userId,
    })

    await rule.save()

    res.status(201).json({
      success: true,
      message: "Ticketing rule created successfully",
      data: rule,
    })
  } catch (error) {
    next(error)
  }
}

// GET /api/ticketing-rules
const listTicketingRules = async (req, res, next) => {
  try {
    const { companyId } = req
    const { page = 1, limit = 10, search, ruleType, payloadType } = req.query

    if (!companyId) throw createHttpError(400, "Company ID is required")

    const skip = (page - 1) * limit
    const filter = { company: companyId }

    if (ruleType && RULE_TYPES.includes(ruleType)) {
      filter.ruleType = ruleType
    }

    if (payloadType && PAYLOAD_TYPES.includes(payloadType)) {
      filter.payloadType = payloadType
    }

    if (search && search.trim().length > 0) {
      filter.ruleName = { $regex: search.trim(), $options: "i" }
    }

    const rules = await TicketingRule.find(filter)
      .skip(skip)
      .limit(Number.parseInt(limit))
      .sort({ createdAt: -1 })

    const total = await TicketingRule.countDocuments(filter)

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

// GET /api/ticketing-rules/:id
const getTicketingRule = async (req, res, next) => {
  try {
    const { id } = req.params
    const { companyId } = req

    if (!companyId) throw createHttpError(400, "Company ID is required")

    const rule = await TicketingRule.findOne({
      _id: id,
      company: companyId,
    })

    if (!rule) {
      throw createHttpError(404, "Ticketing rule not found")
    }

    res.json({
      success: true,
      data: rule,
    })
  } catch (error) {
    next(error)
  }
}

// PUT /api/ticketing-rules/:id
const updateTicketingRule = async (req, res, next) => {
  try {
    const { id } = req.params
    const { companyId, userId } = req
    const {
      ruleName,
      payloadType,
      sameDayOnly,
      startOffsetDays,
      restrictedWindowHours,
      normalFeeType,
      normalFeeValue,
      restrictedPenalty,
      taxRefundable,
      commissionReversal,
    } = req.body

    if (!companyId) throw createHttpError(400, "Company ID is required")

    const rule = await TicketingRule.findOne({
      _id: id,
      company: companyId,
    })

    if (!rule) {
      throw createHttpError(404, "Ticketing rule not found")
    }

    // Validate updates
    if (ruleName !== undefined) {
      if (typeof ruleName !== "string" || ruleName.trim().length === 0)
        throw createHttpError(400, "ruleName must be a non-empty string")
      rule.ruleName = ruleName.trim()
    }

    if (payloadType !== undefined) {
      if (!PAYLOAD_TYPES.includes(payloadType))
        throw createHttpError(400, `Invalid payloadType. Must be one of: ${PAYLOAD_TYPES.join(", ")}`)
      rule.payloadType = payloadType
    }

    if (sameDayOnly !== undefined) {
      rule.sameDayOnly = Boolean(sameDayOnly)
    }

    if (startOffsetDays !== undefined) {
      if (typeof startOffsetDays !== "number" || startOffsetDays < 0)
        throw createHttpError(400, "startOffsetDays must be a non-negative number")
      rule.startOffsetDays = Math.floor(startOffsetDays)
    }

    if (restrictedWindowHours !== undefined) {
      if (typeof restrictedWindowHours !== "number" || restrictedWindowHours < 0)
        throw createHttpError(400, "restrictedWindowHours must be a non-negative number")
      rule.restrictedWindowHours = restrictedWindowHours
    }

    if (normalFeeType !== undefined) {
      if (normalFeeType === null) {
        rule.normalFeeType = null
        rule.normalFeeValue = null
      } else {
        if (!FEE_TYPES.includes(normalFeeType))
          throw createHttpError(400, `Invalid normalFeeType. Must be one of: ${FEE_TYPES.join(", ")}`)
        rule.normalFeeType = normalFeeType
      }
    }

    if (normalFeeValue !== undefined) {
      if (typeof normalFeeValue !== "number" || normalFeeValue < 0)
        throw createHttpError(400, "normalFeeValue must be a non-negative number")
      rule.normalFeeValue = normalFeeValue
    }

    if (restrictedPenalty !== undefined) {
      if (!restrictedPenalty.feeType || restrictedPenalty.feeValue === undefined)
        throw createHttpError(400, "restrictedPenalty must have feeType and feeValue")
      if (!FEE_TYPES.includes(restrictedPenalty.feeType))
        throw createHttpError(400, `Invalid restrictedPenalty.feeType`)
      if (typeof restrictedPenalty.feeValue !== "number" || restrictedPenalty.feeValue < 0)
        throw createHttpError(400, "restrictedPenalty.feeValue must be non-negative")
      rule.restrictedPenalty = restrictedPenalty
    }

    if (taxRefundable !== undefined) {
      rule.taxRefundable = Boolean(taxRefundable)
    }

    if (commissionReversal !== undefined) {
      rule.commissionReversal = Boolean(commissionReversal)
    }

    rule.updatedBy = userId
    await rule.save()

    res.json({
      success: true,
      message: "Ticketing rule updated successfully",
      data: rule,
    })
  } catch (error) {
    next(error)
  }
}

// DELETE /api/ticketing-rules/:id
const deleteTicketingRule = async (req, res, next) => {
  try {
    const { id } = req.params
    const { companyId } = req

    if (!companyId) throw createHttpError(400, "Company ID is required")

    const rule = await TicketingRule.findOne({
      _id: id,
      company: companyId,
    })

    if (!rule) {
      throw createHttpError(404, "Ticketing rule not found")
    }

    // Soft delete
    rule.isDeleted = true
    await rule.save()

    res.json({
      success: true,
      message: "Ticketing rule deleted successfully",
    })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  createTicketingRule,
  listTicketingRules,
  getTicketingRule,
  updateTicketingRule,
  deleteTicketingRule,
}
