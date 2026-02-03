const createHttpError = require("http-errors")
const mongoose = require("mongoose")
const { PayloadType, PAYLOAD_CATEGORIES } = require("../models/PayloadType")

/**
 * Helper function to build actor object based on user role
 */
function buildActor(user) {
  if (!user) {
    return { type: "system", name: "System" }
  }

  if (user.role === "company") {
    return {
      id: user.id,
      name: user.email,
      type: "company",
    }
  }

  return {
    id: user.id,
    name: user.email,
    type: "user",
    layer: user.layer,
  }
}

/**
 * Validate payload type fields based on category
 * Handles both old (string) and new (numeric) ageRange formats for backward compatibility
 */
function validateCategoryFields(category, body) {
  const errors = []

  if (category === "passenger") {
    // Accept both old string format and new numeric format
    if (!body.ageRange) {
      errors.push("ageRange is required for passenger category")
    } else if (typeof body.ageRange === "object") {
      // New numeric format
      if (body.ageRange.from === undefined || body.ageRange.from === null) {
        errors.push("ageRange.from is required for passenger category")
      } else if (typeof body.ageRange.from !== "number") {
        errors.push("ageRange.from must be a number")
      } else if (body.ageRange.from < 0 || body.ageRange.from > 150) {
        errors.push("ageRange.from must be between 0 and 150")
      }

      if (body.ageRange.to === undefined || body.ageRange.to === null) {
        errors.push("ageRange.to is required for passenger category")
      } else if (typeof body.ageRange.to !== "number") {
        errors.push("ageRange.to must be a number")
      } else if (body.ageRange.to < 0 || body.ageRange.to > 150) {
        errors.push("ageRange.to must be between 0 and 150")
      }

      if (
        body.ageRange.from !== undefined &&
        body.ageRange.to !== undefined &&
        body.ageRange.from > body.ageRange.to
      ) {
        errors.push("ageRange.from must be less than or equal to ageRange.to")
      }
    }

    if (body.maxWeight !== undefined && body.maxWeight !== null) {
      errors.push("maxWeight must be null for passenger category")
    }
    if (body.dimensions !== undefined && body.dimensions !== null) {
      errors.push("dimensions must be null for passenger category")
    }
  } else if (category === "cargo" || category === "vehicle") {
    if (body.maxWeight === undefined || body.maxWeight === null) {
      errors.push("maxWeight is required for cargo/vehicle category")
    } else if (typeof body.maxWeight !== "number" || body.maxWeight < 0) {
      errors.push("maxWeight must be a positive number")
    }

    if (!body.dimensions) {
      errors.push("dimensions is required for cargo/vehicle category")
    }

    if (body.ageRange !== undefined && body.ageRange !== null) {
      errors.push("ageRange must be null for cargo/vehicle category")
    }
  }

  return errors
}

/**
 * GET /api/payload-types
 * List all payload types for the company with filtering and pagination
 */
const listPayloadTypes = async (req, res, next) => {
  try {
    const { companyId } = req
    const { category, search, page = 1, limit = 10 } = req.query

    if (!companyId) {
      throw createHttpError(400, "Company ID is required")
    }

    // Parse pagination
    const pageNum = Math.max(1, parseInt(page) || 1)
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10))
    const skip = (pageNum - 1) * limitNum

    // Build query
    const query = {
      company: companyId,
      isDeleted: false,
    }

    // Add category filter if provided
    if (category && category.trim()) {
      const validCategories = PAYLOAD_CATEGORIES
      if (!validCategories.includes(category.toLowerCase())) {
        throw createHttpError(
          400,
          `Category must be one of: ${validCategories.join(", ")}`
        )
      }
      query.category = category.toLowerCase()
    }

    // Add search filter if provided
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), "i")
      query.$or = [{ name: searchRegex }, { code: searchRegex }, { description: searchRegex }]
    }

    // Fetch payload types and total count
    const [payloadTypes, total] = await Promise.all([
      PayloadType.find(query)
        .select(
          "_id name code description category ageRange maxWeight dimensions status createdBy updatedBy createdAt updatedAt"
        )
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      PayloadType.countDocuments(query),
    ])

    const totalPages = Math.ceil(total / limitNum)

    res.status(200).json({
      success: true,
      message: "Payload types retrieved successfully",
      data: {
        payloadTypes,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages,
        },
      },
    })
  } catch (error) {
    next(error)
  }
}

/**
 * GET /api/payload-types/:id
 * Get a specific payload type by ID
 */
const getPayloadTypeById = async (req, res, next) => {
  try {
    const { id } = req.params
    const { companyId } = req

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw createHttpError(400, "Invalid payload type ID format")
    }

    const payloadType = await PayloadType.findOne({
      _id: id,
      company: companyId,
      isDeleted: false,
    })
      .select(
        "_id name code description category ageRange maxWeight dimensions status createdBy updatedBy createdAt updatedAt"
      )
      .lean()

    if (!payloadType) {
      throw createHttpError(404, "Payload type not found")
    }

    res.status(200).json({
      success: true,
      message: "Payload type retrieved successfully",
      data: payloadType,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * POST /api/payload-types
 * Create a new payload type
 */
const createPayloadType = async (req, res, next) => {
  try {
    const { companyId, user } = req
    const { name, code, description = "", category, ageRange, maxWeight, dimensions, status = "Active" } = req.body

    if (!companyId) {
      throw createHttpError(400, "Company ID is required")
    }

    // Validate required fields
    if (!name || !code || !category) {
      throw createHttpError(400, "Missing required fields: name, code, category")
    }

    // Validate category
    if (!PAYLOAD_CATEGORIES.includes(category.toLowerCase())) {
      throw createHttpError(400, `Category must be one of: ${PAYLOAD_CATEGORIES.join(", ")}`)
    }

    // Validate category-specific fields
    const categoryErrors = validateCategoryFields(category.toLowerCase(), { ageRange, maxWeight, dimensions })
    if (categoryErrors.length > 0) {
      throw createHttpError(400, categoryErrors.join("; "))
    }

    // Validate code format
    if (typeof code !== "string" || code.length < 2 || code.length > 5) {
      throw createHttpError(400, "Code must be between 2 and 5 characters")
    }

    // Check for duplicate code within company and category
    const existingPayloadType = await PayloadType.findOne({
      company: companyId,
      code: code.toUpperCase(),
      category: category.toLowerCase(),
      isDeleted: false,
    })

    if (existingPayloadType) {
      throw createHttpError(
        409,
        `Payload type with code "${code}" already exists for this company in ${category} category`
      )
    }

    // Validate status if provided
    const validStatuses = ["Active", "Inactive"]
    if (status && !validStatuses.includes(status)) {
      throw createHttpError(400, `Status must be one of: ${validStatuses.join(", ")}`)
    }

    // Build createdBy object
    const createdBy = buildActor(user)

    // Create payload type
    const payloadType = new PayloadType({
      company: companyId,
      name: name.trim(),
      code: code.toUpperCase().trim(),
      description: description ? description.trim() : "",
      category: category.toLowerCase(),
      ageRange: category.toLowerCase() === "passenger" ? ageRange : undefined,
      maxWeight: ["cargo", "vehicle"].includes(category.toLowerCase()) ? maxWeight : undefined,
      dimensions: ["cargo", "vehicle"].includes(category.toLowerCase()) ? dimensions : undefined,
      status: status || "Active",
      createdBy,
    })

    await payloadType.save()

    // Return created payload type
    const payloadTypeData = payloadType.toObject()

    res.status(201).json({
      success: true,
      message: "Payload type created successfully",
      data: payloadTypeData,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * PUT /api/payload-types/:id
 * Update an existing payload type
 */
const updatePayloadType = async (req, res, next) => {
  try {
    const { id } = req.params
    const { companyId, user } = req
    const { name, code, description, category, ageRange, maxWeight, dimensions, status } = req.body

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw createHttpError(400, "Invalid payload type ID format")
    }

    // Fetch the payload type
    const payloadType = await PayloadType.findOne({
      _id: id,
      company: companyId,
      isDeleted: false,
    })

    if (!payloadType) {
      throw createHttpError(404, "Payload type not found")
    }

    // If category is being changed, validate the new category
    let newCategory = payloadType.category
    if (category !== undefined) {
      if (!PAYLOAD_CATEGORIES.includes(category.toLowerCase())) {
        throw createHttpError(400, `Category must be one of: ${PAYLOAD_CATEGORIES.join(", ")}`)
      }
      newCategory = category.toLowerCase()
    }

    // Validate category-specific fields for the resulting category
    const categoryErrors = validateCategoryFields(newCategory, {
      ageRange: ageRange !== undefined ? ageRange : payloadType.ageRange,
      maxWeight: maxWeight !== undefined ? maxWeight : payloadType.maxWeight,
      dimensions: dimensions !== undefined ? dimensions : payloadType.dimensions,
    })
    if (categoryErrors.length > 0) {
      throw createHttpError(400, categoryErrors.join("; "))
    }

    // Update fields if provided
    if (name !== undefined) {
      payloadType.name = name.trim()
    }

    if (code !== undefined) {
      // Check for duplicate code within company and category
      const codeUpperCase = code.toUpperCase().trim()
      if (codeUpperCase !== payloadType.code) {
        const existingPayloadType = await PayloadType.findOne({
          company: companyId,
          code: codeUpperCase,
          category: newCategory,
          _id: { $ne: id },
          isDeleted: false,
        })

        if (existingPayloadType) {
          throw createHttpError(
            409,
            `Payload type with code "${code}" already exists for this company in ${newCategory} category`
          )
        }
      }

      payloadType.code = codeUpperCase
    }

    if (description !== undefined) {
      payloadType.description = description.trim()
    }

    if (category !== undefined) {
      payloadType.category = category.toLowerCase()
    }

    if (newCategory === "passenger") {
      if (ageRange !== undefined) {
        payloadType.ageRange = ageRange
      }
      // Clear cargo/vehicle fields
      payloadType.maxWeight = undefined
      payloadType.dimensions = undefined
    } else if (newCategory === "cargo" || newCategory === "vehicle") {
      if (maxWeight !== undefined) {
        payloadType.maxWeight = maxWeight
      }
      if (dimensions !== undefined) {
        payloadType.dimensions = dimensions
      }
      // Clear passenger field
      payloadType.ageRange = undefined
    }

    if (status !== undefined) {
      const validStatuses = ["Active", "Inactive"]
      if (!validStatuses.includes(status)) {
        throw createHttpError(400, `Status must be one of: ${validStatuses.join(", ")}`)
      }
      payloadType.status = status
    }

    // Build updatedBy object
    const updatedBy = buildActor(user)
    payloadType.updatedBy = updatedBy

    await payloadType.save()

    res.status(200).json({
      success: true,
      message: "Payload type updated successfully",
      data: payloadType.toObject(),
    })
  } catch (error) {
    next(error)
  }
}

/**
 * DELETE /api/payload-types/:id
 * Soft delete a payload type
 */
const deletePayloadType = async (req, res, next) => {
  try {
    const { id } = req.params
    const { companyId, user } = req

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw createHttpError(400, "Invalid payload type ID format")
    }

    const payloadType = await PayloadType.findOne({
      _id: id,
      company: companyId,
      isDeleted: false,
    })

    if (!payloadType) {
      throw createHttpError(404, "Payload type not found")
    }

    // Soft delete
    payloadType.isDeleted = true
    const updatedBy = buildActor(user)
    payloadType.updatedBy = updatedBy
    await payloadType.save()

    res.status(200).json({
      success: true,
      message: "Payload type deleted successfully",
      data: { _id: payloadType._id, deletedAt: new Date() },
    })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  listPayloadTypes,
  getPayloadTypeById,
  createPayloadType,
  updatePayloadType,
  deletePayloadType,
}
