const createHttpError = require("http-errors")
const mongoose = require("mongoose")
const { Trip } = require("../models/Trip")

const VALID_PROMOTION_BASIS = ["Period", "Trip"]
const VALID_VALUE_TYPES = ["percentage", "fixed"]

/**
 * Middleware to validate promotion request body
 */
const validatePromotion = async (req, res, next) => {
  try {
    const {
      promotionName,
      description,
      promotionBasis,
      trip,
      startDate,
      endDate,
      status,
      passengerBenefit,
      cargoBenefit,
      vehicleBenefit,
      serviceBenefits,
    } = req.body

    const errors = []

    // Validate promotionName (REQUIRED)
    if (!promotionName || promotionName.trim().length === 0) {
      errors.push("promotionName is required")
    } else if (typeof promotionName !== "string") {
      errors.push("promotionName must be a string")
    } else if (promotionName.trim().length > 200) {
      errors.push("promotionName must not exceed 200 characters")
    }

    // Validate promotionBasis (REQUIRED)
    if (!promotionBasis) {
      errors.push("promotionBasis is required")
    } else if (!VALID_PROMOTION_BASIS.includes(promotionBasis)) {
      errors.push(`promotionBasis must be one of: ${VALID_PROMOTION_BASIS.join(", ")}`)
    }

    // Validate startDate (REQUIRED)
    if (!startDate) {
      errors.push("startDate is required")
    } else {
      const date = new Date(startDate)
      if (isNaN(date.getTime())) {
        errors.push("startDate must be a valid ISO date string")
      }
    }

    // Validate endDate (REQUIRED)
    if (!endDate) {
      errors.push("endDate is required")
    } else {
      const date = new Date(endDate)
      if (isNaN(date.getTime())) {
        errors.push("endDate must be a valid ISO date string")
      }
    }

    // Validate endDate > startDate
    if (startDate && endDate) {
      const start = new Date(startDate)
      const end = new Date(endDate)
      if (end <= start) {
        errors.push("endDate must be greater than startDate")
      }
    }

    // If promotionBasis = "Trip", trip is REQUIRED
    if (promotionBasis === "Trip") {
      if (!trip) {
        errors.push("trip is required when promotionBasis is Trip")
      } else if (typeof trip !== "string" || !mongoose.Types.ObjectId.isValid(trip)) {
        errors.push("trip must be a valid ObjectId")
      } else {
        // Validate trip exists
        const { companyId } = req
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

    // If promotionBasis = "Period", trip must be NULL
    if (promotionBasis === "Period" && trip) {
      errors.push("trip must be null when promotionBasis is Period")
    }

    // Validate that at least one benefit is enabled
    const hasEnabledBenefit =
      (passengerBenefit && passengerBenefit.isEnabled) ||
      (cargoBenefit && cargoBenefit.isEnabled) ||
      (vehicleBenefit && vehicleBenefit.isEnabled)

    if (!hasEnabledBenefit) {
      errors.push("At least one benefit (passenger, cargo, or vehicle) must be enabled")
    }

    // Validate passenger benefit
    if (passengerBenefit) {
      if (passengerBenefit.isEnabled) {
        if (passengerBenefit.value === undefined || passengerBenefit.value === null) {
          errors.push("passengerBenefit.value is required when enabled")
        } else if (typeof passengerBenefit.value !== "number") {
          errors.push("passengerBenefit.value must be a number")
        } else if (passengerBenefit.value <= 0) {
          errors.push("passengerBenefit.value must be greater than 0 when enabled")
        }

        if (
          passengerBenefit.valueType &&
          !VALID_VALUE_TYPES.includes(passengerBenefit.valueType)
        ) {
          errors.push(
            `passengerBenefit.valueType must be one of: ${VALID_VALUE_TYPES.join(", ")}`,
          )
        }
      }
    }

    // Validate cargo benefit
    if (cargoBenefit) {
      if (cargoBenefit.isEnabled) {
        if (cargoBenefit.value === undefined || cargoBenefit.value === null) {
          errors.push("cargoBenefit.value is required when enabled")
        } else if (typeof cargoBenefit.value !== "number") {
          errors.push("cargoBenefit.value must be a number")
        } else if (cargoBenefit.value <= 0) {
          errors.push("cargoBenefit.value must be greater than 0 when enabled")
        }

        if (cargoBenefit.valueType && !VALID_VALUE_TYPES.includes(cargoBenefit.valueType)) {
          errors.push(
            `cargoBenefit.valueType must be one of: ${VALID_VALUE_TYPES.join(", ")}`,
          )
        }
      }
    }

    // Validate vehicle benefit
    if (vehicleBenefit) {
      if (vehicleBenefit.isEnabled) {
        if (vehicleBenefit.value === undefined || vehicleBenefit.value === null) {
          errors.push("vehicleBenefit.value is required when enabled")
        } else if (typeof vehicleBenefit.value !== "number") {
          errors.push("vehicleBenefit.value must be a number")
        } else if (vehicleBenefit.value <= 0) {
          errors.push("vehicleBenefit.value must be greater than 0 when enabled")
        }

        if (vehicleBenefit.valueType && !VALID_VALUE_TYPES.includes(vehicleBenefit.valueType)) {
          errors.push(
            `vehicleBenefit.valueType must be one of: ${VALID_VALUE_TYPES.join(", ")}`,
          )
        }
      }
    }

    // Validate serviceBenefits
    if (serviceBenefits && Array.isArray(serviceBenefits)) {
      for (let i = 0; i < serviceBenefits.length; i++) {
        const benefit = serviceBenefits[i]

        if (!benefit.title || benefit.title.trim().length === 0) {
          errors.push(`serviceBenefits[${i}].title is required`)
        } else if (typeof benefit.title !== "string") {
          errors.push(`serviceBenefits[${i}].title must be a string`)
        }

        if (!benefit.valueType) {
          errors.push(`serviceBenefits[${i}].valueType is required`)
        } else if (!VALID_VALUE_TYPES.includes(benefit.valueType)) {
          errors.push(
            `serviceBenefits[${i}].valueType must be one of: ${VALID_VALUE_TYPES.join(", ")}`,
          )
        }

        if (benefit.value === undefined || benefit.value === null) {
          errors.push(`serviceBenefits[${i}].value is required`)
        } else if (typeof benefit.value !== "number") {
          errors.push(`serviceBenefits[${i}].value must be a number`)
        } else if (benefit.value < 0) {
          errors.push(`serviceBenefits[${i}].value must be greater than or equal to 0`)
        }
      }
    }

    // Validate status (optional)
    if (status && !["Active", "Inactive"].includes(status)) {
      errors.push("status must be either Active or Inactive")
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
    console.error("[v0] Promotion validation middleware error:", error)
    next(error)
  }
}

module.exports = {
  validatePromotion,
}
