const createHttpError = require("http-errors")
const mongoose = require("mongoose")
const { PayloadType } = require("../models/PayloadType")
const { Cabin } = require("../models/Cabin")

const VALID_PROVIDER_TYPES = ["Company", "Partner"]
const VALID_APPLIED_LAYERS = ["Company", "Marine Agent", "Commercial Agent", "Selling Agent"]
const VALID_PARTNER_SCOPES = ["AllChildPartners", "SpecificPartner"]
const VALID_RULE_TYPES = ["Markup", "Discount"]
const VALID_VALUE_TYPES = ["percentage", "fixed"]

/**
 * Middleware to validate markup/discount rule request body
 */
const validateMarkupDiscount = async (req, res, next) => {
  try {
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
      payloadTypes,
      cabins,
      routeFrom,
      routeTo,
      effectiveDate,
      priority,
    } = req.body
    const { companyId } = req

    const errors = []

    // Validate ruleName
    if (!ruleName || ruleName.trim().length === 0) {
      errors.push("ruleName is required")
    } else if (typeof ruleName !== "string") {
      errors.push("ruleName must be a string")
    } else if (ruleName.trim().length > 200) {
      errors.push("ruleName must not exceed 200 characters")
    }

    // Validate provider
    if (!provider) {
      errors.push("provider is required")
    } else if (typeof provider !== "string") {
      errors.push("provider must be a valid ObjectId string")
    }

    // Validate providerType
    if (!providerType) {
      errors.push("providerType is required")
    } else if (!VALID_PROVIDER_TYPES.includes(providerType)) {
      errors.push(`providerType must be one of: ${VALID_PROVIDER_TYPES.join(", ")}`)
    }

    // Validate appliedLayer
    if (!appliedLayer) {
      errors.push("appliedLayer is required")
    } else if (!VALID_APPLIED_LAYERS.includes(appliedLayer)) {
      errors.push(`appliedLayer must be one of: ${VALID_APPLIED_LAYERS.join(", ")}`)
    }

    // Validate partnerScope
    if (!partnerScope) {
      errors.push("partnerScope is required")
    } else if (!VALID_PARTNER_SCOPES.includes(partnerScope)) {
      errors.push(`partnerScope must be one of: ${VALID_PARTNER_SCOPES.join(", ")}`)
    }

    // Validate partner (required if partnerScope is SpecificPartner)
    if (partnerScope === "SpecificPartner" && !partner) {
      errors.push("partner is required when partnerScope is SpecificPartner")
    } else if (partner && typeof partner !== "string") {
      errors.push("partner must be a valid ObjectId string")
    }

    // Validate ruleType
    if (!ruleType) {
      errors.push("ruleType is required")
    } else if (!VALID_RULE_TYPES.includes(ruleType)) {
      errors.push(`ruleType must be one of: ${VALID_RULE_TYPES.join(", ")}`)
    }

    // Validate ruleValue
    if (ruleValue === undefined || ruleValue === null) {
      errors.push("ruleValue is required")
    } else if (typeof ruleValue !== "number") {
      errors.push("ruleValue must be a number")
    } else if (ruleValue < 0) {
      errors.push("ruleValue must be positive or zero")
    }

    // Validate valueType
    if (!valueType) {
      errors.push("valueType is required")
    } else if (!VALID_VALUE_TYPES.includes(valueType)) {
      errors.push(`valueType must be one of: ${VALID_VALUE_TYPES.join(", ")}`)
    }

    // Validate payloadTypes
    if (!payloadTypes || !Array.isArray(payloadTypes) || payloadTypes.length === 0) {
      errors.push("payloadTypes is required and must be a non-empty array")
    } else {
      for (const payloadTypeId of payloadTypes) {
        if (!mongoose.Types.ObjectId.isValid(payloadTypeId)) {
          errors.push(`Invalid payloadType ObjectId: ${payloadTypeId}`)
          break
        }
      }
      // Check if payloadTypes exist in database (only if companyId is available)
      if (errors.length === 0 && companyId) {
        const existingPayloadTypes = await PayloadType.countDocuments({
          _id: { $in: payloadTypes.map((id) => mongoose.Types.ObjectId(id)) },
          company: companyId,
          isDeleted: false,
        })
        if (existingPayloadTypes !== payloadTypes.length) {
          errors.push("One or more payloadTypes do not exist or are deleted")
        }
      }
    }

    // Validate cabins
    if (!cabins || !Array.isArray(cabins) || cabins.length === 0) {
      errors.push("cabins is required and must be a non-empty array")
    } else {
      for (const cabinId of cabins) {
        if (!mongoose.Types.ObjectId.isValid(cabinId)) {
          errors.push(`Invalid cabin ObjectId: ${cabinId}`)
          break
        }
      }
      // Check if cabins exist in database (only if companyId is available)
      if (errors.length === 0 && companyId) {
        const existingCabins = await Cabin.countDocuments({
          _id: { $in: cabins.map((id) => mongoose.Types.ObjectId(id)) },
          company: companyId,
          isDeleted: false,
        })
        if (existingCabins !== cabins.length) {
          errors.push("One or more cabins do not exist or are deleted")
        }
      }
    }

    // Validate routeFrom
    if (!routeFrom) {
      errors.push("routeFrom is required")
    } else if (typeof routeFrom !== "string") {
      errors.push("routeFrom must be a valid ObjectId string")
    }

    // Validate routeTo
    if (!routeTo) {
      errors.push("routeTo is required")
    } else if (typeof routeTo !== "string") {
      errors.push("routeTo must be a valid ObjectId string")
    }

    // Validate routeFrom and routeTo are different
    if (routeFrom && routeTo && routeFrom === routeTo) {
      errors.push("routeFrom and routeTo must be different ports")
    }

    // Validate effectiveDate
    if (!effectiveDate) {
      errors.push("effectiveDate is required")
    } else {
      const date = new Date(effectiveDate)
      if (isNaN(date.getTime())) {
        errors.push("effectiveDate must be a valid ISO date string")
      }
    }

    // Validate priority (optional, but validate if provided)
    if (priority !== undefined && priority !== null) {
      if (typeof priority !== "number") {
        errors.push("priority must be a number")
      } else if (priority < 1) {
        errors.push("priority must be at least 1")
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors,
      })
    }

    next()
  } catch (error) {
    console.error("[v0] Validation middleware error:", error)
    next(error)
  }
}

module.exports = {
  validateMarkupDiscount,
}
