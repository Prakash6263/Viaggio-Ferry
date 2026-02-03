const createHttpError = require("http-errors")

/**
 * Middleware to validate PayloadType fields based on category
 * Enforces strict category-specific validation rules
 */
const validatePayloadType = (req, res, next) => {
  try {
    const { category, ageRange, maxWeight, dimensions } = req.body

    if (!category) {
      throw createHttpError(400, "Category is required")
    }

    const validCategories = ["passenger", "cargo", "vehicle"]
    const normalizedCategory = category.toLowerCase()

    if (!validCategories.includes(normalizedCategory)) {
      throw createHttpError(400, `Category must be one of: ${validCategories.join(", ")}`)
    }

    // PASSENGER VALIDATION
    if (normalizedCategory === "passenger") {
      // ageRange is REQUIRED and must be an object with from and to
      if (!ageRange || typeof ageRange !== "object") {
        throw createHttpError(400, "ageRange is required for passenger category and must be an object")
      }

      if (ageRange.from === undefined || ageRange.from === null) {
        throw createHttpError(400, "ageRange.from is required for passenger category")
      }

      if (ageRange.to === undefined || ageRange.to === null) {
        throw createHttpError(400, "ageRange.to is required for passenger category")
      }

      // Validate types
      if (typeof ageRange.from !== "number" || typeof ageRange.to !== "number") {
        throw createHttpError(400, "ageRange.from and ageRange.to must be numbers")
      }

      // Validate ranges
      if (ageRange.from < 0 || ageRange.from > 150) {
        throw createHttpError(400, "ageRange.from must be between 0 and 150")
      }

      if (ageRange.to < 0 || ageRange.to > 150) {
        throw createHttpError(400, "ageRange.to must be between 0 and 150")
      }

      // Validate from <= to
      if (ageRange.from > ageRange.to) {
        throw createHttpError(400, "ageRange.from must be less than or equal to ageRange.to")
      }

      // maxWeight MUST be null/undefined
      if (maxWeight !== undefined && maxWeight !== null) {
        throw createHttpError(400, "maxWeight must be null/undefined for passenger category")
      }

      // dimensions MUST be null/undefined
      if (dimensions !== undefined && dimensions !== null) {
        throw createHttpError(400, "dimensions must be null/undefined for passenger category")
      }
    }

    // CARGO AND VEHICLE VALIDATION
    if (normalizedCategory === "cargo" || normalizedCategory === "vehicle") {
      // ageRange MUST be null/undefined
      if (ageRange !== undefined && ageRange !== null) {
        throw createHttpError(400, `ageRange must be null/undefined for ${normalizedCategory} category`)
      }

      // maxWeight is REQUIRED
      if (maxWeight === undefined || maxWeight === null) {
        throw createHttpError(400, `maxWeight is required for ${normalizedCategory} category`)
      }

      // Validate maxWeight type and value
      if (typeof maxWeight !== "number" || maxWeight < 0) {
        throw createHttpError(400, "maxWeight must be a positive number")
      }

      // dimensions is REQUIRED
      if (!dimensions || typeof dimensions !== "string") {
        throw createHttpError(400, `dimensions is required for ${normalizedCategory} category and must be a string`)
      }

      if (dimensions.trim().length === 0) {
        throw createHttpError(400, "dimensions cannot be empty")
      }
    }

    next()
  } catch (error) {
    next(error)
  }
}

module.exports = validatePayloadType
