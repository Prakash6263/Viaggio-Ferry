const createHttpError = require("http-errors")
const mongoose = require("mongoose")

/**
 * Validation middleware for creating/updating trips
 */
const validateTripPayload = (req, res, next) => {
  try {
    const {
      tripName,
      tripCode,
      ship,
      departurePort,
      arrivalPort,
      departureDateTime,
      arrivalDateTime,
      status,
    } = req.body

    const errors = []

    // Required fields
    if (!tripName || typeof tripName !== "string" || !tripName.trim()) {
      errors.push("tripName is required and must be a non-empty string")
    }

    if (!tripCode || typeof tripCode !== "string" || !tripCode.trim()) {
      errors.push("tripCode is required and must be a non-empty string")
    }

    if (!ship || !mongoose.Types.ObjectId.isValid(ship)) {
      errors.push("ship is required and must be a valid ObjectId")
    }

    if (!departurePort || !mongoose.Types.ObjectId.isValid(departurePort)) {
      errors.push("departurePort is required and must be a valid ObjectId")
    }

    if (!arrivalPort || !mongoose.Types.ObjectId.isValid(arrivalPort)) {
      errors.push("arrivalPort is required and must be a valid ObjectId")
    }

    if (!departureDateTime) {
      errors.push("departureDateTime is required")
    } else if (isNaN(new Date(departureDateTime).getTime())) {
      errors.push("departureDateTime must be a valid date")
    }

    if (!arrivalDateTime) {
      errors.push("arrivalDateTime is required")
    } else if (isNaN(new Date(arrivalDateTime).getTime())) {
      errors.push("arrivalDateTime must be a valid date")
    }

    // Optional fields validation
    if (status) {
      const validStatuses = ["SCHEDULED", "OPEN", "CLOSED", "COMPLETED", "CANCELLED"]
      if (!validStatuses.includes(status)) {
        errors.push(`status must be one of: ${validStatuses.join(", ")}`)
      }
    }

    const optionalDateFields = [
      "bookingOpeningDate",
      "bookingClosingDate",
      "checkInOpeningDate",
      "checkInClosingDate",
      "boardingClosingDate",
    ]

    for (const field of optionalDateFields) {
      if (req.body[field] && isNaN(new Date(req.body[field]).getTime())) {
        errors.push(`${field} must be a valid date`)
      }
    }

    if (errors.length > 0) {
      throw createHttpError(400, errors.join("; "))
    }

    next()
  } catch (error) {
    next(error)
  }
}

/**
 * Validation middleware for allocation payloads
 */
const validateAllocationPayload = (req, res, next) => {
  try {
    const { partner, allocations } = req.body

    const errors = []

    if (!partner || !mongoose.Types.ObjectId.isValid(partner)) {
      errors.push("partner is required and must be a valid ObjectId")
    }

    if (!Array.isArray(allocations)) {
      errors.push("allocations must be an array")
    } else if (allocations.length === 0) {
      errors.push("allocations must not be empty")
    } else {
      for (let i = 0; i < allocations.length; i++) {
        const alloc = allocations[i]

        if (!alloc.availabilityId || !mongoose.Types.ObjectId.isValid(alloc.availabilityId)) {
          errors.push(`allocations[${i}].availabilityId is required and must be a valid ObjectId`)
        }

        if (typeof alloc.quantity !== "number" || alloc.quantity <= 0) {
          errors.push(`allocations[${i}].quantity must be a positive number`)
        }

        if (alloc.soldQuantity !== undefined && (typeof alloc.soldQuantity !== "number" || alloc.soldQuantity < 0)) {
          errors.push(`allocations[${i}].soldQuantity must be a non-negative number`)
        }
      }
    }

    if (errors.length > 0) {
      throw createHttpError(400, errors.join("; "))
    }

    next()
  } catch (error) {
    next(error)
  }
}

/**
 * Validate pagination parameters
 */
const validatePaginationParams = (req, res, next) => {
  try {
    const { page, limit } = req.query

    if (page && (isNaN(page) || parseInt(page) < 1)) {
      throw createHttpError(400, "page must be a positive number")
    }

    if (limit && (isNaN(limit) || parseInt(limit) < 1)) {
      throw createHttpError(400, "limit must be a positive number")
    }

    next()
  } catch (error) {
    next(error)
  }
}

/**
 * Validate date range parameters
 */
const validateDateRangeParams = (req, res, next) => {
  try {
    const { startDate, endDate } = req.query

    if (startDate && isNaN(new Date(startDate).getTime())) {
      throw createHttpError(400, "startDate must be a valid date")
    }

    if (endDate && isNaN(new Date(endDate).getTime())) {
      throw createHttpError(400, "endDate must be a valid date")
    }

    if (startDate && endDate) {
      if (new Date(startDate) > new Date(endDate)) {
        throw createHttpError(400, "startDate must be before endDate")
      }
    }

    next()
  } catch (error) {
    next(error)
  }
}

module.exports = {
  validateTripPayload,
  validateAllocationPayload,
  validatePaginationParams,
  validateDateRangeParams,
}
