const createHttpError = require("http-errors")
const { TicketingRule, RULE_TYPES, PAYLOAD_TYPES, PENALTY_TYPES } = require("../models/TicketingRule")

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
      normalFee,
      restrictedPenalty,
      noShowPenalty,
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

    // Helper to validate penalty config
    const validatePenaltyConfig = (penalty, fieldName) => {
      if (!penalty) return null
      if (!penalty.type || !PENALTY_TYPES.includes(penalty.type))
        throw createHttpError(400, `${fieldName}.type must be one of: ${PENALTY_TYPES.join(", ")}`)
      if (typeof penalty.value !== "number" || penalty.value < 0)
        throw createHttpError(400, `${fieldName}.value must be a non-negative number`)
      return penalty
    }

    const normalFeeConfig = normalFee ? validatePenaltyConfig(normalFee, "normalFee") : { type: "NONE", value: 0 }
    const restrictedPenaltyConfig = restrictedPenalty ? validatePenaltyConfig(restrictedPenalty, "restrictedPenalty") : { type: "NONE", value: 0 }
    const noShowPenaltyConfig = noShowPenalty ? validatePenaltyConfig(noShowPenalty, "noShowPenalty") : { type: "NONE", value: 0 }

    const rule = new TicketingRule({
      company: companyId,
      ruleType,
      ruleName: ruleName.trim(),
      payloadType,
      sameDayOnly,
      startOffsetDays: Math.max(0, Math.floor(startOffsetDays)),
      restrictedWindowHours,
      normalFee: normalFeeConfig,
      restrictedPenalty: restrictedPenaltyConfig,
      noShowPenalty: noShowPenaltyConfig,
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
      normalFee,
      restrictedPenalty,
      noShowPenalty,
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

    // Helper to validate penalty config
    const validatePenaltyConfig = (penalty, fieldName) => {
      if (!penalty) return null
      if (!penalty.type || !PENALTY_TYPES.includes(penalty.type))
        throw createHttpError(400, `${fieldName}.type must be one of: ${PENALTY_TYPES.join(", ")}`)
      if (typeof penalty.value !== "number" || penalty.value < 0)
        throw createHttpError(400, `${fieldName}.value must be a non-negative number`)
      return penalty
    }

    if (normalFee !== undefined) {
      rule.normalFee = normalFee ? validatePenaltyConfig(normalFee, "normalFee") : { type: "NONE", value: 0 }
    }

    if (restrictedPenalty !== undefined) {
      rule.restrictedPenalty = restrictedPenalty ? validatePenaltyConfig(restrictedPenalty, "restrictedPenalty") : { type: "NONE", value: 0 }
    }

    if (noShowPenalty !== undefined) {
      rule.noShowPenalty = noShowPenalty ? validatePenaltyConfig(noShowPenalty, "noShowPenalty") : { type: "NONE", value: 0 }
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
