const createHttpError = require("http-errors")
const mongoose = require("mongoose")
const { Port } = require("../models/Port")

/**
 * GET /api/ports
 * List all ports for the company with search and pagination
 */
const listPorts = async (req, res, next) => {
  try {
    const { companyId } = req
    const { search, page = 1, limit = 10 } = req.query

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

    // Add search filter if provided
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), "i")
      query.$or = [{ name: searchRegex }, { code: searchRegex }]
    }

    // Fetch ports and total count
    const [ports, total] = await Promise.all([
      Port.find(query)
        .select("_id name code country timezone status notes createdBy updatedBy createdAt updatedAt")
        .sort({ name: 1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Port.countDocuments(query),
    ])

    const totalPages = Math.ceil(total / limitNum)

    res.status(200).json({
      success: true,
      message: "Ports retrieved successfully",
      data: {
        ports,
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
 * GET /api/ports/:id
 * Get a specific port by ID
 */
const getPortById = async (req, res, next) => {
  try {
    const { id } = req.params
    const { companyId } = req

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw createHttpError(400, "Invalid port ID format")
    }

    const port = await Port.findOne({
      _id: id,
      company: companyId,
      isDeleted: false,
    })
      .select("_id name code country timezone status notes createdBy updatedBy createdAt updatedAt")
      .lean()

    if (!port) {
      throw createHttpError(404, "Port not found")
    }

    res.status(200).json({
      success: true,
      message: "Port retrieved successfully",
      data: port,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * POST /api/ports
 * Create a new port
 */
const createPort = async (req, res, next) => {
  try {
    const { companyId, user } = req
    const { name, code, country, timezone, status = "Active", notes = "" } = req.body

    if (!companyId) {
      throw createHttpError(400, "Company ID is required")
    }

    // Validate required fields
    if (!name || !code || !country || !timezone) {
      throw createHttpError(400, "Missing required fields: name, code, country, timezone")
    }

    // Validate code format
    if (typeof code !== "string" || code.length < 2 || code.length > 5) {
      throw createHttpError(400, "Code must be between 2 and 5 characters")
    }

    // Check for duplicate code within company
    const existingPort = await Port.findOne({
      company: companyId,
      code: code.toUpperCase(),
      isDeleted: false,
    })

    if (existingPort) {
      throw createHttpError(409, `Port with code "${code}" already exists for this company`)
    }

    // Validate status if provided
    const validStatuses = ["Active", "Inactive"]
    if (status && !validStatuses.includes(status)) {
      throw createHttpError(400, `Status must be one of: ${validStatuses.join(", ")}`)
    }

    // Build createdBy object based on user role (using JWT as source of truth)
    let createdBy
    if (user.role === "company") {
      // For company role: no layer field
      createdBy = {
        id: user.id,
        name: user.email, // Use email as fallback for company name
        type: "company",
      }
    } else {
      // For user role: include layer from JWT
      createdBy = {
        id: user.id,
        name: user.email, // Use email as fallback
        type: "user",
        layer: user.layer, // From JWT token
      }
    }

    // Create port
    const port = new Port({
      company: companyId,
      name: name.trim(),
      code: code.toUpperCase().trim(),
      country: country.trim(),
      timezone: timezone.trim(),
      status: status || "Active",
      notes: notes ? notes.trim() : "",
      createdBy,
    })

    await port.save()

    // Return created port
    const portData = port.toObject()

    res.status(201).json({
      success: true,
      message: "Port created successfully",
      data: portData,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * PUT /api/ports/:id
 * Update an existing port
 */
const updatePort = async (req, res, next) => {
  try {
    const { id } = req.params
    const { companyId, user } = req
    const { name, code, country, timezone, status, notes } = req.body

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw createHttpError(400, "Invalid port ID format")
    }

    // Fetch the port
    const port = await Port.findOne({
      _id: id,
      company: companyId,
      isDeleted: false,
    })

    if (!port) {
      throw createHttpError(404, "Port not found")
    }

    // Update fields if provided
    if (name !== undefined) {
      port.name = name.trim()
    }

    if (code !== undefined) {
      // Check for duplicate code within company
      const codeUpperCase = code.toUpperCase().trim()
      if (codeUpperCase !== port.code) {
        const existingPort = await Port.findOne({
          company: companyId,
          code: codeUpperCase,
          _id: { $ne: id },
          isDeleted: false,
        })

        if (existingPort) {
          throw createHttpError(409, `Port with code "${code}" already exists for this company`)
        }
      }

      port.code = codeUpperCase
    }

    if (country !== undefined) {
      port.country = country.trim()
    }

    if (timezone !== undefined) {
      port.timezone = timezone.trim()
    }

    if (status !== undefined) {
      const validStatuses = ["Active", "Inactive"]
      if (!validStatuses.includes(status)) {
        throw createHttpError(400, `Status must be one of: ${validStatuses.join(", ")}`)
      }
      port.status = status
    }

    if (notes !== undefined) {
      port.notes = notes.trim()
    }

    // Build updatedBy object based on user role (using JWT as source of truth)
    let updatedBy
    if (user.role === "company") {
      // For company role: no layer field
      updatedBy = {
        id: user.id,
        name: user.email, // Use email as fallback
        type: "company",
      }
    } else {
      // For user role: include layer from JWT
      updatedBy = {
        id: user.id,
        name: user.email, // Use email as fallback
        type: "user",
        layer: user.layer, // From JWT token
      }
    }

    port.updatedBy = updatedBy

    await port.save()

    res.status(200).json({
      success: true,
      message: "Port updated successfully",
      data: port.toObject(),
    })
  } catch (error) {
    next(error)
  }
}

/**
 * DELETE /api/ports/:id
 * Soft delete a port
 */
const deletePort = async (req, res, next) => {
  try {
    const { id } = req.params
    const { companyId } = req

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw createHttpError(400, "Invalid port ID format")
    }

    const port = await Port.findOne({
      _id: id,
      company: companyId,
      isDeleted: false,
    })

    if (!port) {
      throw createHttpError(404, "Port not found")
    }

    // Soft delete
    port.isDeleted = true
    await port.save()

    res.status(200).json({
      success: true,
      message: "Port deleted successfully",
      data: { _id: port._id, deletedAt: new Date() },
    })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  listPorts,
  getPortById,
  createPort,
  updatePort,
  deletePort,
}
