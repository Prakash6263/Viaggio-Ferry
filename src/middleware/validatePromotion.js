const createHttpError = require("http-errors")
const mongoose = require("mongoose")
const { Trip } = require("../models/Trip")

const VALID_PROMOTION_BASIS = ["Period", "Trip"]
const VALID_CALCULATION_TYPES = ["quantity", "value"]
const VALID_DISCOUNT_TYPES = ["percentage", "fixed"]

/**
 * Validate a single service promotion block (cargo or vehicle).
 * Pushes any errors found into the provided errors array.
 *
 * @param {Object} service - The service promotion object
 * @param {string} serviceName - "cargo" or "vehicle"
 * @param {string[]} errors - Array to collect error messages
 */
function validateServiceBlock(service, serviceName, errors) {
  if (!service || !service.isEnabled) return

  // calculationType is required when enabled
  if (!service.calculationType) {
    errors.push(`servicePromotions.${serviceName}.calculationType is required when enabled`)
    return
  }

  if (!VALID_CALCULATION_TYPES.includes(service.calculationType)) {
    errors.push(
      `servicePromotions.${serviceName}.calculationType must be one of: ${VALID_CALCULATION_TYPES.join(", ")}`,
    )
    return
  }

  if (service.calculationType === "quantity") {
    if (service.buyX === undefined || service.buyX === null || typeof service.buyX !== "number" || service.buyX <= 0) {
      errors.push(`servicePromotions.${serviceName}.buyX must be a number greater than 0 when calculationType is quantity`)
    }
    if (service.getY === undefined || service.getY === null || typeof service.getY !== "number" || service.getY <= 0) {
      errors.push(`servicePromotions.${serviceName}.getY must be a number greater than 0 when calculationType is quantity`)
    }
  }

  if (service.calculationType === "value") {
    if (service.minValue === undefined || service.minValue === null || typeof service.minValue !== "number" || service.minValue <= 0) {
      errors.push(`servicePromotions.${serviceName}.minValue must be a number greater than 0 when calculationType is value`)
    }
    if (service.discountValue === undefined || service.discountValue === null || typeof service.discountValue !== "number" || service.discountValue <= 0) {
      errors.push(`servicePromotions.${serviceName}.discountValue must be a number greater than 0 when calculationType is value`)
    }
    if (service.discountType && !VALID_DISCOUNT_TYPES.includes(service.discountType)) {
      errors.push(
        `servicePromotions.${serviceName}.discountType must be one of: ${VALID_DISCOUNT_TYPES.join(", ")}`,
      )
    }
    if (!service.discountType) {
      errors.push(`servicePromotions.${serviceName}.discountType is required when calculationType is value`)
    }
  }

  // Eligibility required for cargo/vehicle (payloadId)
  if (!service.eligibility || !Array.isArray(service.eligibility) || service.eligibility.length === 0) {
    errors.push(`servicePromotions.${serviceName}.eligibility is required with at least one entry when ${serviceName} is enabled`)
  } else {
    for (let i = 0; i < service.eligibility.length; i++) {
      const entry = service.eligibility[i]
      if (!entry.payloadId) {
        errors.push(`servicePromotions.${serviceName}.eligibility[${i}].payloadId is required`)
      } else if (!mongoose.Types.ObjectId.isValid(entry.payloadId)) {
        errors.push(`servicePromotions.${serviceName}.eligibility[${i}].payloadId must be a valid ObjectId`)
      }
    }
  }
}

/**
 * Middleware to validate promotion request body.
 *
 * Rules (from spec):
 * - promotionName required
 * - startDate < endDate
 * - promotionBasis: Trip -> trip required; Period -> trip must be null
 * - At least one service enabled (passenger OR cargo OR vehicle)
 * - For ANY service: quantity -> buyX>0 & getY>0; value -> minValue>0 & discountValue>0
 * - Passenger eligibility: passengerTypeId & cabinId required when passenger enabled
 */
const validatePromotion = async (req, res, next) => {
  try {
    const {
      promotionName,
      promotionBasis,
      trip,
      startDate,
      endDate,
      status,
      servicePromotions,
    } = req.body

    const errors = []

    // ---- promotionName ----
    if (!promotionName || (typeof promotionName === "string" && promotionName.trim().length === 0)) {
      errors.push("promotionName is required")
    } else if (typeof promotionName !== "string") {
      errors.push("promotionName must be a string")
    } else if (promotionName.trim().length > 200) {
      errors.push("promotionName must not exceed 200 characters")
    }

    // ---- promotionBasis ----
    if (!promotionBasis) {
      errors.push("promotionBasis is required")
    } else if (!VALID_PROMOTION_BASIS.includes(promotionBasis)) {
      errors.push(`promotionBasis must be one of: ${VALID_PROMOTION_BASIS.join(", ")}`)
    }

    // ---- startDate / endDate (only required for Period basis) ----
    if (promotionBasis === "Period") {
      if (!startDate) {
        errors.push("startDate is required when promotionBasis is Period")
      } else if (isNaN(new Date(startDate).getTime())) {
        errors.push("startDate must be a valid date")
      }

      if (!endDate) {
        errors.push("endDate is required when promotionBasis is Period")
      } else if (isNaN(new Date(endDate).getTime())) {
        errors.push("endDate must be a valid date")
      }

      // startDate < endDate
      if (startDate && endDate) {
        const start = new Date(startDate)
        const end = new Date(endDate)
        if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end <= start) {
          errors.push("endDate must be greater than startDate")
        }
      }
    }

    // ---- promotionBasis / trip coupling ----
    if (promotionBasis === "Trip") {
      if (!trip) {
        errors.push("trip is required when promotionBasis is Trip")
      } else if (typeof trip !== "string" || !mongoose.Types.ObjectId.isValid(trip)) {
        errors.push("trip must be a valid ObjectId")
      } else {
        // Validate trip exists and belongs to this company
        const { companyId } = req
        if (companyId) {
          const tripExists = await Trip.exists({
            _id: trip,
            company: companyId,
            isDeleted: false,
          })
          if (!tripExists) {
            errors.push("trip does not exist or does not belong to this company")
          }
        }
      }
    }

    if (promotionBasis === "Period" && trip) {
      errors.push("trip must be null when promotionBasis is Period")
    }

    // ---- status (optional) ----
    if (status && !["Active", "Inactive"].includes(status)) {
      errors.push("status must be either Active or Inactive")
    }

    // ---- servicePromotions ----
    if (!servicePromotions || typeof servicePromotions !== "object") {
      errors.push("servicePromotions is required and must be an object")
    } else {
      const { passenger, cargo, vehicle } = servicePromotions

      // At least one service must be enabled
      const hasEnabled =
        (passenger && passenger.isEnabled) ||
        (cargo && cargo.isEnabled) ||
        (vehicle && vehicle.isEnabled)

      if (!hasEnabled) {
        errors.push("At least one service (passenger, cargo, or vehicle) must be enabled")
      }

      // ---- Validate passenger ----
      if (passenger && passenger.isEnabled) {
        // calculationType required
        if (!passenger.calculationType) {
          errors.push("servicePromotions.passenger.calculationType is required when enabled")
        } else if (!VALID_CALCULATION_TYPES.includes(passenger.calculationType)) {
          errors.push(
            `servicePromotions.passenger.calculationType must be one of: ${VALID_CALCULATION_TYPES.join(", ")}`,
          )
        } else {
          if (passenger.calculationType === "quantity") {
            if (passenger.buyX === undefined || passenger.buyX === null || typeof passenger.buyX !== "number" || passenger.buyX <= 0) {
              errors.push("servicePromotions.passenger.buyX must be a number greater than 0 when calculationType is quantity")
            }
            if (passenger.getY === undefined || passenger.getY === null || typeof passenger.getY !== "number" || passenger.getY <= 0) {
              errors.push("servicePromotions.passenger.getY must be a number greater than 0 when calculationType is quantity")
            }
          }

          if (passenger.calculationType === "value") {
            if (passenger.minValue === undefined || passenger.minValue === null || typeof passenger.minValue !== "number" || passenger.minValue <= 0) {
              errors.push("servicePromotions.passenger.minValue must be a number greater than 0 when calculationType is value")
            }
            if (passenger.discountValue === undefined || passenger.discountValue === null || typeof passenger.discountValue !== "number" || passenger.discountValue <= 0) {
              errors.push("servicePromotions.passenger.discountValue must be a number greater than 0 when calculationType is value")
            }
            if (!passenger.discountType) {
              errors.push("servicePromotions.passenger.discountType is required when calculationType is value")
            } else if (!VALID_DISCOUNT_TYPES.includes(passenger.discountType)) {
              errors.push(
                `servicePromotions.passenger.discountType must be one of: ${VALID_DISCOUNT_TYPES.join(", ")}`,
              )
            }
          }
        }

        // Passenger eligibility: required when passenger is enabled
        if (!passenger.eligibility || !Array.isArray(passenger.eligibility) || passenger.eligibility.length === 0) {
          errors.push("servicePromotions.passenger.eligibility is required with at least one entry when passenger is enabled")
        } else {
          for (let i = 0; i < passenger.eligibility.length; i++) {
            const entry = passenger.eligibility[i]
            if (!entry.passengerTypeId) {
              errors.push(`servicePromotions.passenger.eligibility[${i}].passengerTypeId is required`)
            } else if (!mongoose.Types.ObjectId.isValid(entry.passengerTypeId)) {
              errors.push(`servicePromotions.passenger.eligibility[${i}].passengerTypeId must be a valid ObjectId`)
            }
            if (!entry.cabinId) {
              errors.push(`servicePromotions.passenger.eligibility[${i}].cabinId is required`)
            } else if (!mongoose.Types.ObjectId.isValid(entry.cabinId)) {
              errors.push(`servicePromotions.passenger.eligibility[${i}].cabinId must be a valid ObjectId`)
            }
          }
        }
      }

      // ---- Validate cargo ----
      validateServiceBlock(cargo, "cargo", errors)

      // ---- Validate vehicle ----
      validateServiceBlock(vehicle, "vehicle", errors)
    }

    // Return all errors at once
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors,
      })
    }

    next()
  } catch (error) {
    next(error)
  }
}

module.exports = {
  validatePromotion,
}
