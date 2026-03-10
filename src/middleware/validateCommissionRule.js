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
      provider,
      providerType,
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

    // Validate provider
    if (!provider) {
      errors.push("provider is required")
    } else if (typeof provider !== "string") {
      errors.push("provider must be a valid ObjectId string")
    } else if (!mongoose.Types.ObjectId.isValid(provider)) {
      errors.push("provider must be a valid ObjectId")
    }

    // Validate providerType
    if (!providerType) {
      errors.push("providerType is required")
    } else if (!VALID_PROVIDER_TYPES.includes(providerType)) {
      errors.push(`providerType must be one of: ${VALID_PROVIDER_TYPES.join(", ")}`)
    }

    // Validate provider based on providerType
    if (errors.length === 0 && provider && providerType) {
      try {
        if (providerType === "Company") {
          if (provider !== companyId) {
            errors.push("provider must match companyId when providerType is Company")
          }
        } else if (providerType === "Partner") {
          const partnerExists = await Partner.exists({
            _id: provider,
            company: companyId,
            isDeleted: false,
          })
          if (!partnerExists) {
            errors.push("provider does not exist or does not belong to this company")
          }
        }
      } catch (err) {
        console.error("[v0] Error validating provider:", err)
        errors.push("Error validating provider")
      }
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

    // Validate commissionType
    if (!commissionType) {
      errors.push("commissionType is required")
    } else if (!VALID_COMMISSION_TYPES.includes(commissionType)) {
      errors.push(`commissionType must be one of: ${VALID_COMMISSION_TYPES.join(", ")}`)
    }

    // Validate commissionValue
    if (commissionValue === undefined || commissionValue === null) {
      errors.push("commissionValue is required")
    } else if (typeof commissionValue !== "number") {
      errors.push("commissionValue must be a number")
    } else if (commissionValue < 0) {
      errors.push("commissionValue must be positive or zero")
    }

    // Validate serviceDetails
    if (!serviceDetails || typeof serviceDetails !== "object") {
      errors.push("serviceDetails is required and must be an object")
    } else {
      const { passenger = [], cargo = [], vehicle = [] } = serviceDetails

      // Check if at least one service type exists
      const hasServiceDetails =
        (Array.isArray(passenger) && passenger.length > 0) ||
        (Array.isArray(cargo) && cargo.length > 0) ||
        (Array.isArray(vehicle) && vehicle.length > 0)

      if (!hasServiceDetails) {
        errors.push("serviceDetails must contain at least one service type (passenger, cargo, or vehicle)")
      }

      // Validate passenger service
      if (Array.isArray(passenger) && passenger.length > 0) {
        for (const service of passenger) {
          if (!service.cabinId) {
            errors.push("passenger service items must have cabinId")
            break
          }
          if (!mongoose.Types.ObjectId.isValid(service.cabinId)) {
            errors.push(`Invalid passenger cabinId: ${service.cabinId}`)
            break
          }
        }
      }

      // Validate cargo service
      if (Array.isArray(cargo) && cargo.length > 0) {
        for (const service of cargo) {
          if (!service.cabinId) {
            errors.push("cargo service items must have cabinId")
            break
          }
          if (!mongoose.Types.ObjectId.isValid(service.cabinId)) {
            errors.push(`Invalid cargo cabinId: ${service.cabinId}`)
            break
          }
        }
      }

      // Validate vehicle service
      if (Array.isArray(vehicle) && vehicle.length > 0) {
        for (const service of vehicle) {
          if (!service.cabinId) {
            errors.push("vehicle service items must have cabinId")
            break
          }
          if (!mongoose.Types.ObjectId.isValid(service.cabinId)) {
            errors.push(`Invalid vehicle cabinId: ${service.cabinId}`)
            break
          }
        }
      }

      // Check if cabins exist in database
      if (errors.length === 0 && companyId) {
        const allCabinIds = [
          ...(passenger || []).map((s) => s.cabinId),
          ...(cargo || []).map((s) => s.cabinId),
          ...(vehicle || []).map((s) => s.cabinId),
        ]

        if (allCabinIds.length > 0) {
          const existingCabins = await Cabin.countDocuments({
            _id: { $in: allCabinIds },
            company: companyId,
            isDeleted: false,
          })
          if (existingCabins !== allCabinIds.length) {
            errors.push("One or more cabins do not exist or are deleted")
          }
        }
      }
    }

    // Validate routes array
    const { routes } = req.body
    if (!routes) {
      errors.push("routes array is required")
    } else if (!Array.isArray(routes)) {
      errors.push("routes must be an array")
    } else if (routes.length === 0) {
      errors.push("At least one route is required")
    } else {
      // Validate each route in the array
      for (let i = 0; i < routes.length; i++) {
        const route = routes[i]
        
        if (!route || typeof route !== "object") {
          errors.push(`Route ${i + 1}: must be an object with routeFrom and routeTo`)
          break
        }
        
        if (!route.routeFrom) {
          errors.push(`Route ${i + 1}: routeFrom is required`)
          break
        }
        
        if (!route.routeTo) {
          errors.push(`Route ${i + 1}: routeTo is required`)
          break
        }
        
        if (typeof route.routeFrom !== "string" || !mongoose.Types.ObjectId.isValid(route.routeFrom)) {
          errors.push(`Route ${i + 1}: routeFrom must be a valid ObjectId`)
          break
        }
        
        if (typeof route.routeTo !== "string" || !mongoose.Types.ObjectId.isValid(route.routeTo)) {
          errors.push(`Route ${i + 1}: routeTo must be a valid ObjectId`)
          break
        }
        
        if (route.routeFrom === route.routeTo) {
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

    // Validate expiryDate (optional, but validate if provided)
    if (expiryDate !== undefined && expiryDate !== null && expiryDate !== "") {
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
