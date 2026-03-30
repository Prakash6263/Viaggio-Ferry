const createHttpError = require("http-errors")
const mongoose = require("mongoose")
const { Cabin } = require("../models/Cabin")
const Partner = require("../models/Partner")
const { MarkupDiscountRule } = require("../models/MarkupDiscountRule")

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
      serviceDetails,
      routeFrom,
      routeTo,
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

    // Validate provider (MANDATORY)
    if (!provider) {
      errors.push("provider is required")
    } else if (typeof provider !== "string") {
      errors.push("provider must be a valid ObjectId string")
    } else if (!mongoose.Types.ObjectId.isValid(provider)) {
      errors.push("provider must be a valid ObjectId")
    } else {
      // Validate provider based on providerType if both provided
      if (providerType) {
        try {
          console.log("[v0] Validating provider - ID:", provider, "Type:", providerType, "Company:", companyId)
          if (providerType === "Company") {
            // For Company providerType, provider can be:
            // 1. The company ID itself (company-level admin)
            // 2. A Partner ID belonging to this company (hierarchical user with parent permission)
            if (provider === companyId) {
              console.log("[v0] Provider matches company ID - VALID")
              // Provider is the company itself - this is valid
            } else {
              // Check if provider is a Partner that belongs to this company
              console.log("[v0] Checking if provider is a Partner in this company...")
              const partnerExists = await Partner.exists({
                _id: provider,
                company: companyId,
                isDeleted: false,
              })
              console.log("[v0] Partner lookup result:", partnerExists)
              if (!partnerExists) {
                // Additional debugging - check all Partners in this company
                const allPartners = await Partner.find({
                  company: companyId,
                  isDeleted: false,
                }).select("_id name layer")
                console.log("[v0] Available Partners in company:", allPartners.map(p => ({ id: p._id, name: p.name, layer: p.layer })))
                errors.push("provider must be either the company or a partner belonging to this company")
              } else {
                console.log("[v0] Provider found as Partner - VALID")
              }
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
    }

    // Validate providerType (MANDATORY)
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

    // Validate partnerScope (optional)
    if (partnerScope && !VALID_PARTNER_SCOPES.includes(partnerScope)) {
      errors.push(`partnerScope must be one of: ${VALID_PARTNER_SCOPES.join(", ")}`)
    }

    // Validate partner (optional)
    if (partner && typeof partner !== "string") {
      errors.push("partner must be a valid ObjectId string")
    }

    // Validate ruleType
    if (!ruleType) {
      errors.push("ruleType is required")
    } else if (!VALID_RULE_TYPES.includes(ruleType)) {
      errors.push(`ruleType must be one of: ${VALID_RULE_TYPES.join(", ")}`)
    }

    // Validate ruleValue (MANDATORY - Commission Value)
    if (ruleValue === undefined || ruleValue === null) {
      errors.push("ruleValue (Commission Value) is required")
    } else if (typeof ruleValue !== "number") {
      errors.push("ruleValue must be a number")
    } else if (ruleValue < 0) {
      errors.push("ruleValue must be positive or zero")
    }

    // Validate valueType (optional)
    if (valueType && !VALID_VALUE_TYPES.includes(valueType)) {
      errors.push(`valueType must be one of: ${VALID_VALUE_TYPES.join(", ")}`)
    }

    // Validate serviceDetails (MANDATORY: at least one checkbox required)
    if (!serviceDetails || typeof serviceDetails !== "object") {
      errors.push("serviceDetails is required and must be an object")
    } else {
      const { passenger = [], cargo = [], vehicle = [] } = serviceDetails

      // Check if at least one service type exists (Passenger, Cargo, or Vehicle)
      const hasServiceDetails =
        (Array.isArray(passenger) && passenger.length > 0) ||
        (Array.isArray(cargo) && cargo.length > 0) ||
        (Array.isArray(vehicle) && vehicle.length > 0)

      if (!hasServiceDetails) {
        errors.push("At least one of Passenger, Cargo, or Vehicle must be selected")
      }

      // Validate passenger service
      if (Array.isArray(passenger) && passenger.length > 0) {
        if (passenger.length === 0) {
          errors.push("passenger service must have at least one cabinId when included")
        } else {
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

    // Validate routes array (optional)
    const { routes } = req.body
    if (routes) {
      if (!Array.isArray(routes)) {
        errors.push("routes must be an array")
      } else if (routes.length > 0) {
        // Validate each route in the array only if provided
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
    console.error("[v0] Validation middleware error:", error)
    next(error)
  }
}

module.exports = {
  validateMarkupDiscount,
}
   
