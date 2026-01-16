const createHttpError = require("http-errors")
const User = require("../models/User")
const AccessGroup = require("../models/AccessGroup")
const Partner = require("../models/Partner")
const { LAYER_CODES, MODULE_CODES } = require("../constants/rbac")

/**
 * POST /api/users
 * Create a new user with automatic layer resolution and module access assignment
 *
 * Business Rules:
 * 1. If isSalesman = true:
 *    - Force layer = "selling-agent"
 *    - partnerId becomes REQUIRED
 *
 * 2. If isSalesman = false:
 *    - Use provided layer value
 *    - partnerId required for: marine-agent, commercial-agent, selling-agent
 *    - partnerId optional for: company
 *
 * 3. Validate email uniqueness per company
 * 4. Validate all access groups match resolved layer + module + company
 */
const createUser = async (req, res, next) => {
  try {
    const { fullName, email, position, layer, isSalesman, partnerId, remarks, moduleAccess } = req.body
    const { companyId, userId } = req

    if (!fullName || !email || !position) {
      throw createHttpError(400, "fullName, email, and position are required")
    }

    let resolvedLayer = layer
    if (isSalesman === true) {
      resolvedLayer = "selling-agent"
    }

    if (!LAYER_CODES.includes(resolvedLayer)) {
      throw createHttpError(400, `Invalid layer: ${resolvedLayer}. Must be one of: ${LAYER_CODES.join(", ")}`)
    }

    if (["marine-agent", "commercial-agent", "selling-agent"].includes(resolvedLayer)) {
      if (!partnerId) {
        throw createHttpError(400, `partnerId is required for ${resolvedLayer} layer`)
      }

      // Verify partner exists and belongs to this company
      const partner = await Partner.findOne({
        _id: partnerId,
        company: companyId,
        isDeleted: false,
      })

      if (!partner) {
        throw createHttpError(404, "Partner not found for this company")
      }
    } else if (resolvedLayer === "company" && partnerId) {
      // Validate partner exists if provided for company layer
      const partner = await Partner.findOne({
        _id: partnerId,
        company: companyId,
        isDeleted: false,
      })

      if (!partner) {
        throw createHttpError(404, "Partner not found for this company")
      }
    }

    const existingUser = await User.findOne({
      company: companyId,
      email: email.toLowerCase(),
      isDeleted: false,
    })

    if (existingUser) {
      throw createHttpError(400, "Email already exists for this company")
    }

    const validatedModuleAccess = []
    if (moduleAccess && Array.isArray(moduleAccess)) {
      for (const access of moduleAccess) {
        const { moduleCode, accessGroupId } = access

        if (!moduleCode || !accessGroupId) {
          throw createHttpError(400, "Each module access must have moduleCode and accessGroupId")
        }

        if (!MODULE_CODES.includes(moduleCode)) {
          throw createHttpError(400, `Invalid module code: ${moduleCode}`)
        }

        // Fetch and validate access group
        const accessGroup = await AccessGroup.findOne({
          _id: accessGroupId,
          company: companyId,
          moduleCode: moduleCode,
          layer: resolvedLayer,
          isActive: true,
          isDeleted: false,
        })

        if (!accessGroup) {
          throw createHttpError(
            404,
            `Access group not found for module '${moduleCode}' with layer '${resolvedLayer}' and status active`,
          )
        }

        validatedModuleAccess.push({
          moduleCode,
          accessGroupId,
        })
      }
    }

    const newUser = new User({
      company: companyId,
      fullName: fullName.trim(),
      email: email.toLowerCase().trim(),
      position: position.trim(),
      layer: resolvedLayer, // Store resolved layer on user
      isSalesman: isSalesman === true,
      agent: resolvedLayer === "company" ? companyId : partnerId || null, // Auto-assign companyId when layer is company
      remarks: remarks ? remarks.trim() : "",
      status: "Active",
      moduleAccess: validatedModuleAccess, // Changed from accessGroups to moduleAccess
    })

    await newUser.save()

    await newUser.populate({
      path: "moduleAccess.accessGroupId",
      select: "groupName groupCode moduleCode layer permissions",
    })

    res.status(201).json({
      success: true,
      message: "User created successfully",
      data: {
        _id: newUser._id,
        fullName: newUser.fullName,
        email: newUser.email,
        position: newUser.position,
        layer: newUser.layer,
        isSalesman: newUser.isSalesman,
        agent: newUser.agent,
        remarks: newUser.remarks,
        status: newUser.status,
        moduleAccess: newUser.moduleAccess, // Changed response field to moduleAccess
        createdAt: newUser.createdAt,
      },
    })
  } catch (error) {
    next(error)
  }
}

/**
 * GET /api/access-groups/by-module-layer
 * Get active access groups for a specific module and layer
 *
 * Query Parameters:
 * - moduleCode (required)
 * - layer (required)
 *
 * Returns: Array of active access groups matching the criteria
 */
const getAccessGroupsByModuleAndLayer = async (req, res, next) => {
  try {
    const { moduleCode, layer } = req.query
    const { companyId } = req

    if (!moduleCode || !layer) {
      throw createHttpError(400, "moduleCode and layer query parameters are required")
    }

    if (!MODULE_CODES.includes(moduleCode)) {
      throw createHttpError(400, `Invalid module code: ${moduleCode}`)
    }

    if (!LAYER_CODES.includes(layer)) {
      throw createHttpError(400, `Invalid layer: ${layer}`)
    }

    const accessGroups = await AccessGroup.find({
      company: companyId,
      moduleCode: moduleCode,
      layer: layer,
      isActive: true,
      isDeleted: false,
    }).select("_id groupName groupCode moduleCode layer permissions")

    res.json({
      success: true,
      data: {
        moduleCode,
        layer,
        accessGroups: accessGroups.map((ag) => ({
          _id: ag._id,
          groupName: ag.groupName,
          groupCode: ag.groupCode,
          moduleCode: ag.moduleCode,
          layer: ag.layer,
          permissions: ag.permissions,
        })),
        count: accessGroups.length,
      },
    })
  } catch (error) {
    next(error)
  }
}

/**
 * GET /api/users
 * Get all users for the company with pagination, filtering, and sorting
 *
 * Query Parameters:
 * - page (optional, default: 1)
 * - limit (optional, default: 10)
 * - status (optional: Active, Inactive)
 * - layer (optional: company, marine-agent, commercial-agent, selling-agent)
 * - search (optional: search by fullName, email, position)
 * - sortBy (optional: default createdAt)
 * - sortOrder (optional: asc, desc)
 *
 * Returns: Paginated list of users with moduleAccess populated
 */
const getAllUsers = async (req, res, next) => {
  try {
    const { companyId } = req
    const { page = 1, limit = 10, status, layer, search, sortBy = "createdAt", sortOrder = "desc" } = req.query

    const pageNum = Math.max(1, Number.parseInt(page) || 1)
    const limitNum = Math.min(100, Math.max(1, Number.parseInt(limit) || 10)) // Max 100 results per page

    // Build filter object
    const filter = {
      company: companyId,
      isDeleted: false,
    }

    if (status && ["Active", "Inactive"].includes(status)) {
      filter.status = status
    }

    if (layer) {
      const { LAYER_CODES } = require("../constants/rbac")
      if (!LAYER_CODES.includes(layer)) {
        throw createHttpError(400, `Invalid layer: ${layer}`)
      }
      filter.layer = layer
    }

    // Full text search on fullName, email, position
    if (search && search.trim()) {
      filter.$text = { $search: search.trim() }
    }

    // Build sort object
    const sortObj = {}
    sortObj[sortBy] = sortOrder === "asc" ? 1 : -1

    // Execute query with pagination
    const totalCount = await User.countDocuments(filter)
    const users = await User.find(filter)
      .populate({
        path: "moduleAccess.accessGroupId",
        select: "groupName groupCode moduleCode layer permissions",
      })
      .populate({
        path: "agent",
        select: "_id name partnerCode",
      })
      .sort(sortObj)
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)

    const totalPages = Math.ceil(totalCount / limitNum)

    res.json({
      success: true,
      data: {
        users: users.map((user) => ({
          _id: user._id,
          fullName: user.fullName,
          email: user.email,
          position: user.position,
          layer: user.layer,
          isSalesman: user.isSalesman,
          agent: user.agent,
          remarks: user.remarks,
          status: user.status,
          moduleAccess: user.moduleAccess,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        })),
        pagination: {
          currentPage: pageNum,
          totalPages,
          pageSize: limitNum,
          totalCount,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1,
        },
      },
    })
  } catch (error) {
    next(error)
  }
}

/**
 * GET /api/users/:userId
 * Get a single user by ID
 *
 * Returns: User details with moduleAccess populated
 */
const getUserById = async (req, res, next) => {
  try {
    const { userId } = req.params
    const { companyId } = req

    const user = await User.findOne({
      _id: userId,
      company: companyId,
      isDeleted: false,
    })
      .populate({
        path: "moduleAccess.accessGroupId",
        select: "groupName groupCode moduleCode layer permissions",
      })
      .populate({
        path: "agent",
        select: "_id name partnerCode",
      })

    if (!user) {
      throw createHttpError(404, "User not found")
    }

    res.json({
      success: true,
      data: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        position: user.position,
        layer: user.layer,
        isSalesman: user.isSalesman,
        agent: user.agent,
        remarks: user.remarks,
        status: user.status,
        moduleAccess: user.moduleAccess,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    })
  } catch (error) {
    next(error)
  }
}

/**
 * PUT /api/users/:userId
 * Update user information
 *
 * Updatable Fields:
 * - fullName
 * - position
 * - remarks
 * - status (Active, Inactive)
 * - moduleAccess (array of { moduleCode, accessGroupId })
 *
 * Non-updatable Fields:
 * - email, layer, isSalesman, agent, company (use other endpoints for these)
 *
 * Returns: Updated user data
 */
const updateUser = async (req, res, next) => {
  try {
    const { userId } = req.params
    const { companyId } = req
    const { fullName, position, remarks, status, moduleAccess } = req.body

    const user = await User.findOne({
      _id: userId,
      company: companyId,
      isDeleted: false,
    })

    if (!user) {
      throw createHttpError(404, "User not found")
    }

    if (fullName !== undefined) {
      if (!fullName || typeof fullName !== "string") {
        throw createHttpError(400, "fullName must be a non-empty string")
      }
      user.fullName = fullName.trim()
    }

    if (position !== undefined) {
      if (typeof position !== "string") {
        throw createHttpError(400, "position must be a string")
      }
      user.position = position.trim()
    }

    if (remarks !== undefined) {
      if (typeof remarks !== "string") {
        throw createHttpError(400, "remarks must be a string")
      }
      user.remarks = remarks.trim()
    }

    if (status !== undefined) {
      if (!["Active", "Inactive"].includes(status)) {
        throw createHttpError(400, 'status must be either "Active" or "Inactive"')
      }
      user.status = status
    }

    if (moduleAccess !== undefined && Array.isArray(moduleAccess)) {
      const validatedModuleAccess = []

      for (const access of moduleAccess) {
        const { moduleCode, accessGroupId } = access

        if (!moduleCode || !accessGroupId) {
          throw createHttpError(400, "Each module access must have moduleCode and accessGroupId")
        }

        const { MODULE_CODES } = require("../constants/rbac")
        if (!MODULE_CODES.includes(moduleCode)) {
          throw createHttpError(400, `Invalid module code: ${moduleCode}`)
        }

        // Fetch and validate access group
        const accessGroup = await AccessGroup.findOne({
          _id: accessGroupId,
          company: companyId,
          moduleCode: moduleCode,
          layer: user.layer,
          isActive: true,
          isDeleted: false,
        })

        if (!accessGroup) {
          throw createHttpError(
            404,
            `Access group not found for module '${moduleCode}' with layer '${user.layer}' and status active`,
          )
        }

        validatedModuleAccess.push({
          moduleCode,
          accessGroupId,
        })
      }

      user.moduleAccess = validatedModuleAccess
    }

    await user.save()

    await user.populate({
      path: "moduleAccess.accessGroupId",
      select: "groupName groupCode moduleCode layer permissions",
    })

    await user.populate({
      path: "agent",
      select: "_id name partnerCode",
    })

    res.json({
      success: true,
      message: "User updated successfully",
      data: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        position: user.position,
        layer: user.layer,
        isSalesman: user.isSalesman,
        agent: user.agent,
        remarks: user.remarks,
        status: user.status,
        moduleAccess: user.moduleAccess,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    })
  } catch (error) {
    next(error)
  }
}

/**
 * GET /api/users/by-status/:status
 * Get all users filtered by status (Active or Inactive)
 *
 * Route Parameters:
 * - status (required: Active or Inactive)
 *
 * Query Parameters:
 * - page (optional, default: 1)
 * - limit (optional, default: 10)
 * - sortBy (optional: default createdAt)
 * - sortOrder (optional: asc, desc)
 *
 * Returns: Paginated list of users with specified status
 */
const getUsersByStatus = async (req, res, next) => {
  try {
    const { status } = req.params
    const { companyId } = req
    const { page = 1, limit = 10, sortBy = "createdAt", sortOrder = "desc" } = req.query

    // Validate status parameter
    if (!["Active", "Inactive"].includes(status)) {
      throw createHttpError(400, "Status must be either 'Active' or 'Inactive'")
    }

    const pageNum = Math.max(1, Number.parseInt(page) || 1)
    const limitNum = Math.min(100, Math.max(1, Number.parseInt(limit) || 10)) // Max 100 results per page

    // Build filter object
    const filter = {
      company: companyId,
      status: status,
      isDeleted: false,
    }

    // Build sort object
    const sortObj = {}
    sortObj[sortBy] = sortOrder === "asc" ? 1 : -1

    // Execute query with pagination
    const totalCount = await User.countDocuments(filter)
    const users = await User.find(filter)
      .populate({
        path: "moduleAccess.accessGroupId",
        select: "groupName groupCode moduleCode layer permissions",
      })
      .populate({
        path: "agent",
        select: "_id name partnerCode",
      })
      .sort(sortObj)
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)

    const totalPages = Math.ceil(totalCount / limitNum)

    res.json({
      success: true,
      data: {
        status: status,
        users: users.map((user) => ({
          _id: user._id,
          fullName: user.fullName,
          email: user.email,
          position: user.position,
          layer: user.layer,
          isSalesman: user.isSalesman,
          agent: user.agent,
          remarks: user.remarks,
          status: user.status,
          moduleAccess: user.moduleAccess,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        })),
        pagination: {
          currentPage: pageNum,
          totalPages,
          pageSize: limitNum,
          totalCount,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1,
        },
      },
    })
  } catch (error) {
    next(error)
  }
}

/**
 * GET /api/users/salesman/list
 * Get all salesman users with pagination, filtering, and sorting
 *
 * Query Parameters:
 * - page (optional, default: 1)
 * - limit (optional, default: 10)
 * - status (optional: Active, Inactive)
 * - search (optional: search by fullName, email, position)
 * - sortBy (optional: default createdAt)
 * - sortOrder (optional: asc, desc)
 *
 * Returns: Paginated list of salesman users with moduleAccess populated
 */
const getSalesmanUsers = async (req, res, next) => {
  try {
    const { companyId } = req
    const { page = 1, limit = 10, status, search, sortBy = "createdAt", sortOrder = "desc" } = req.query

    const pageNum = Math.max(1, Number.parseInt(page) || 1)
    const limitNum = Math.min(100, Math.max(1, Number.parseInt(limit) || 10)) // Max 100 results per page

    const filter = {
      company: companyId,
      isSalesman: true,
      isDeleted: false,
    }

    if (status && ["Active", "Inactive"].includes(status)) {
      filter.status = status
    }

    // Full text search on fullName, email, position
    if (search && search.trim()) {
      filter.$text = { $search: search.trim() }
    }

    // Build sort object
    const sortObj = {}
    sortObj[sortBy] = sortOrder === "asc" ? 1 : -1

    // Execute query with pagination
    const totalCount = await User.countDocuments(filter)
    const users = await User.find(filter)
      .populate({
        path: "moduleAccess.accessGroupId",
        select: "groupName groupCode moduleCode layer permissions",
      })
      .populate({
        path: "agent",
        select: "_id name partnerCode",
      })
      .sort(sortObj)
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)

    const totalPages = Math.ceil(totalCount / limitNum)

    res.json({
      success: true,
      data: {
        users: users.map((user) => ({
          _id: user._id,
          fullName: user.fullName,
          email: user.email,
          position: user.position,
          layer: user.layer,
          isSalesman: user.isSalesman,
          agent: user.agent,
          remarks: user.remarks,
          status: user.status,
          moduleAccess: user.moduleAccess,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        })),
        pagination: {
          currentPage: pageNum,
          totalPages,
          pageSize: limitNum,
          totalCount,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1,
        },
      },
    })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  createUser,
  getAccessGroupsByModuleAndLayer,
  getAllUsers,
  getUserById,
  updateUser,
  getUsersByStatus,
  getSalesmanUsers,
}
