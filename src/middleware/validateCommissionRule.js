const createHttpError = require("http-errors")
const mongoose = require("mongoose")
const { Cabin } = require("../models/Cabin")
const Partner = require("../models/Partner")
const { CommissionRule } = require("../models/CommissionRule")

const VALID_PROVIDER_TYPES = ["Company", "Partner"]
const VALID_APPLIED_LAYERS = ["Company", "Marine Agent", "Commercial Agent", "Selling Agent"]
const VALID_PARTNER_SCOPES = ["AllChildPartners", "SpecificPartner"]
const VALID_COMMISSION_TYPES = ["percentage", "fixed"]

/**
 * Middleware to validate commission rule request body
 */
const validateCommissionRule = async (req, res, next) => {
  try {
    const {
      ruleName,
      appliedLayer,
      partnerScope,
      partner,
      commissionType,
      commissionValue,
      serviceDetails,
      routes,
      effectiveDate,
      expiryDate,
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

    // providerType, provider, providerCompany, providerPartner are now derived
    // entirely from the JWT token on the backend — no frontend validation needed

    // Validate appliedLayer
    if (!appliedLayer) {
      errors.push("appliedLayer is required")
    } else if (!VALID_APPLIED_LAYERS.includes(appliedLayer)) {
      errors.push(`appliedLayer must be one of: ${VALID_APPLIED_LAYERS.join(", ")}`)
    }

    // Validate partnerScope (optional)
    if (partnerScope && !VALID_PARTNER_SCOPES.includes(partnerScope)) {
      errors.push(`partnerScope must be one of: ${VALID_PARTNER_SCOPES.join(", ")}`)
    }

    // Validate partner (optional)
    if (partner && typeof partner !== "string") {
      errors.push("partner must be a valid ObjectId string")
    }

    // Validate commissionType (optional)
    if (commissionType && !VALID_COMMISSION_TYPES.includes(commissionType)) {
      errors.push(`commissionType must be one of: ${VALID_COMMISSION_TYPES.join(", ")}`)
    }

    // Validate commissionValue (MANDATORY for commission rules)
    if (commissionValue === undefined || commissionValue === null) {
      errors.push("commissionValue is required")
    } else if (typeof commissionValue !== "number") {
      errors.push("commissionValue must be a number")
    } else if (commissionValue < 0) {
      errors.push("commissionValue must be positive or zero")
    }

    // Validate serviceDetails (OPTIONAL - but validate if provided)
    if (serviceDetails && typeof serviceDetails === "object") {
      const { passenger = [], cargo = [], vehicle = [] } = serviceDetails

      // Validate passenger service if provided
      if (Array.isArray(passenger) && passenger.length > 0) {
        for (const service of passenger) {
          if (service.cabinId && !mongoose.Types.ObjectId.isValid(service.cabinId)) {
            errors.push(`Invalid passenger cabinId: ${service.cabinId}`)
            break
          }
        }
      }

      // Validate cargo service if provided
      if (Array.isArray(cargo) && cargo.length > 0) {
        for (const service of cargo) {
          if (service.cabinId && !mongoose.Types.ObjectId.isValid(service.cabinId)) {
            errors.push(`Invalid cargo cabinId: ${service.cabinId}`)
            break
          }
        }
      }

      // Validate vehicle service if provided
      if (Array.isArray(vehicle) && vehicle.length > 0) {
        for (const service of vehicle) {
          if (service.cabinId && !mongoose.Types.ObjectId.isValid(service.cabinId)) {
            errors.push(`Invalid vehicle cabinId: ${service.cabinId}`)
            break
          }
        }
      }

      // Check if cabins exist in database (only if any cabin IDs provided)
      if (errors.length === 0) {
        const rawCabinIds = [
          ...(passenger || []).map((s) => s.cabinId),
          ...(cargo || []).map((s) => s.cabinId),
          ...(vehicle || []).map((s) => s.cabinId),
        ].filter(Boolean) // remove null/undefined

        // Deduplicate using Set — $in also deduplicates, so we must compare unique counts
        const uniqueCabinIds = [...new Set(rawCabinIds.map(String))]

        if (uniqueCabinIds.length > 0) {
          const existingCabins = await Cabin.countDocuments({
            _id: { $in: uniqueCabinIds },
            isDeleted: false,
          })
          if (existingCabins !== uniqueCabinIds.length) {
            errors.push("One or more cabins do not exist or are deleted")
          }
        }
      }
    }

    // Validate routes array (OPTIONAL - routes are not required)
    if (routes && Array.isArray(routes) && routes.length > 0) {
      // Only validate route entries if routes array is provided and has items
      for (let i = 0; i < routes.length; i++) {
        const route = routes[i]

        if (!route || typeof route !== "object") {
          errors.push(`Route ${i + 1}: must be an object with routeFrom and routeTo`)
          break
        }

        // Only validate routeFrom/routeTo if the route object is provided
        // Both are required within a route object, but routes array itself is optional
        if (route.routeFrom && !mongoose.Types.ObjectId.isValid(route.routeFrom)) {
          errors.push(`Route ${i + 1}: routeFrom must be a valid ObjectId`)
          break
        }

        if (route.routeTo && !mongoose.Types.ObjectId.isValid(route.routeTo)) {
          errors.push(`Route ${i + 1}: routeTo must be a valid ObjectId`)
          break
        }

        // If both are provided, they must be different
        if (route.routeFrom && route.routeTo && route.routeFrom === route.routeTo) {
          errors.push(`Route ${i + 1}: routeFrom and routeTo must be different ports`)
          break
        }
      }
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

    // Validate expiryDate (MANDATORY)
    if (!expiryDate) {
      errors.push("expiryDate is required")
    } else {
      const expDate = new Date(expiryDate)
      if (isNaN(expDate.getTime())) {
        errors.push("expiryDate must be a valid ISO date string")
      } else if (effectiveDate) {
        const effDate = new Date(effectiveDate)
        if (expDate <= effDate) {
          errors.push("expiryDate must be greater than effectiveDate")
        }
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
    console.error("[v0] Commission rule validation middleware error:", error)
    next(error)
  }
}

module.exports = {
  validateCommissionRule,
}
