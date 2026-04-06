const createHttpError = require("http-errors")
const AccessGroup = require("../models/AccessGroup")
const { MODULE_SUBMODULES } = require("../constants/rbac")
const {
  isValidModule,
  isValidSubmodule,
  getModule,
  getSubmodule,
} = require("../config/menuConfig")

// POST /api/access-groups
// Create a new access group
const createAccessGroup = async (req, res, next) => {
  try {
    const { groupName, groupCode, moduleCode, layer, isActive, permissions } = req.body
    const { companyId, userId } = req

    // Validate required fields
    if (!groupName || !groupCode || !moduleCode || !layer) {
      throw createHttpError(400, "groupName, groupCode, moduleCode, and layer are required")
    }

    // Check if groupCode already exists for this company
    const existingGroup = await AccessGroup.findOne({
      company: companyId,
      groupCode: groupCode.toUpperCase(),
    })

    if (existingGroup) {
      throw createHttpError(400, "Group code already exists for this company")
    }

    // ==================== VALIDATE AGAINST MENU CONFIG ====================
    // This ensures permissions always map to real features in the system
    if (!isValidModule(moduleCode)) {
      throw createHttpError(400, `Invalid module: ${moduleCode}. Module does not exist in menu configuration.`)
    }

    const moduleConfig = getModule(moduleCode)
    if (!moduleConfig) {
      throw createHttpError(400, `Module configuration not found: ${moduleCode}`)
    }

    // Validate permissions
    if (permissions && Array.isArray(permissions)) {
      for (const perm of permissions) {
        // Validate submodule exists in menuConfig
        if (!isValidSubmodule(moduleCode, perm.submoduleCode)) {
          throw createHttpError(
            400,
            `Submodule ${perm.submoduleCode} not found in module ${moduleCode}. Please check menu configuration.`
          )
        }

        const submoduleConfig = getSubmodule(moduleCode, perm.submoduleCode)
        if (!submoduleConfig) {
          throw createHttpError(400, `Submodule configuration not found: ${perm.submoduleCode}`)
        }

        // Validate that granted permissions are allowed for this submodule
        const allowedActions = submoduleConfig.actions || ["read"]
        const requestedActions = []
        if (perm.canRead) requestedActions.push("read")
        if (perm.canWrite) requestedActions.push("write")
        if (perm.canEdit) requestedActions.push("edit")
        if (perm.canDelete) requestedActions.push("delete")

        for (const action of requestedActions) {
          if (!allowedActions.includes(action)) {
            throw createHttpError(
              400,
              `Permission '${action}' is not allowed for submodule '${perm.submoduleCode}'. Allowed permissions: ${allowedActions.join(", ")}`
            )
          }
        }
      }
    }

    // Create access group
    const accessGroup = new AccessGroup({
      company: companyId,
      groupName: groupName.trim(),
      groupCode: groupCode.toUpperCase(),
      moduleCode,
      layer,
      isActive: isActive !== undefined ? isActive : true,
      permissions: permissions || [],
      createdBy: userId,
    })

    await accessGroup.save()

    res.status(201).json({
      success: true,
      message: "Access group created successfully",
      data: accessGroup,
    })
  } catch (error) {
    next(error)
  }
}

// GET /api/access-groups
// Get list of access groups with optional filtering
const getAccessGroups = async (req, res, next) => {
  try {
    const { moduleCode, layer, isActive, page = 1, limit = 10, search } = req.query
    const { companyId } = req

    const filter = { company: companyId }

    // Apply optional filters
    if (moduleCode) filter.moduleCode = moduleCode
    if (layer) filter.layer = layer
    if (isActive !== undefined) filter.isActive = isActive === "true"
    if (search) {
      filter.$or = [{ groupName: { $regex: search, $options: "i" } }, { groupCode: { $regex: search, $options: "i" } }]
    }

    const skip = (Number(page) - 1) * Number(limit)

    const accessGroups = await AccessGroup.find(filter).skip(skip).limit(Number(limit)).sort({ createdAt: -1 })

    const total = await AccessGroup.countDocuments(filter)

    res.json({
      success: true,
      data: accessGroups,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    })
  } catch (error) {
    next(error)
  }
}

// GET /api/access-groups/:id
// Get single access group details
const getAccessGroup = async (req, res, next) => {
  try {
    const { id } = req.params
    const { companyId } = req

    const accessGroup = await AccessGroup.findOne({
      _id: id,
      company: companyId,
    })

    if (!accessGroup) {
      throw createHttpError(404, "Access group not found")
    }

    res.json({
      success: true,
      data: accessGroup,
    })
  } catch (error) {
    next(error)
  }
}

// PUT /api/access-groups/:id
// Update access group
const updateAccessGroup = async (req, res, next) => {
  try {
    const { id } = req.params
    const { groupName, layer, permissions } = req.body
    const { companyId } = req

    const accessGroup = await AccessGroup.findOne({
      _id: id,
      company: companyId,
    })

    if (!accessGroup) {
      throw createHttpError(404, "Access group not found")
    }

    const moduleCode = accessGroup.moduleCode
    const validSubmodules = MODULE_SUBMODULES[moduleCode]

    // Validate permissions if provided
    if (permissions && Array.isArray(permissions)) {
      for (const perm of permissions) {
        const submoduleExists = validSubmodules.some((sub) => sub.code === perm.submoduleCode)
        if (!submoduleExists) {
          throw createHttpError(400, `Submodule ${perm.submoduleCode} not found in module ${moduleCode}`)
        }

        const submodule = validSubmodules.find((sub) => sub.code === perm.submoduleCode)
        if (submodule.readonly && (perm.canWrite || perm.canEdit || perm.canDelete)) {
          throw createHttpError(400, `${perm.submoduleCode} is read-only. Cannot grant write/edit/delete permissions.`)
        }
      }

      accessGroup.permissions = permissions
    }

    if (groupName) accessGroup.groupName = groupName.trim()
    if (layer) accessGroup.layer = layer

    await accessGroup.save()

    res.json({
      success: true,
      message: "Access group updated successfully",
      data: accessGroup,
    })
  } catch (error) {
    next(error)
  }
}

// PATCH /api/access-groups/:id/status
// Toggle access group status (Active/Inactive)
const toggleAccessGroupStatus = async (req, res, next) => {
  try {
    const { id } = req.params
    const { isActive } = req.body
    const { companyId } = req

    if (typeof isActive !== "boolean") {
      throw createHttpError(400, "isActive must be a boolean value")
    }

    const accessGroup = await AccessGroup.findOne({
      _id: id,
      company: companyId,
    })

    if (!accessGroup) {
      throw createHttpError(404, "Access group not found")
    }

    accessGroup.isActive = isActive
    await accessGroup.save()

    res.json({
      success: true,
      message: isActive ? "Access group activated successfully" : "Access group deactivated successfully",
      data: accessGroup,
    })
  } catch (error) {
    next(error)
  }
}

// DELETE /api/access-groups/:id
// Soft delete access group
const deleteAccessGroup = async (req, res, next) => {
  try {
    const { id } = req.params
    const { companyId } = req

    const accessGroup = await AccessGroup.findOne({
      _id: id,
      company: companyId,
    })

    if (!accessGroup) {
      throw createHttpError(404, "Access group not found")
    }

    // Soft delete
    accessGroup.isDeleted = true
    await accessGroup.save()

    res.json({
      success: true,
      message: "Access group deleted successfully",
      data: accessGroup,
    })
  } catch (error) {
    next(error)
  }
}

// GET /api/access-groups/module/:moduleCode/submodules
// Get available submodules for a module
const getModuleSubmodules = async (req, res, next) => {
  try {
    const { moduleCode } = req.params

    const submodules = MODULE_SUBMODULES[moduleCode]
    if (!submodules) {
      throw createHttpError(400, `Invalid module: ${moduleCode}`)
    }

    res.json({
      success: true,
      data: submodules,
    })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  createAccessGroup,
  getAccessGroups,
  getAccessGroup,
  updateAccessGroup,
  toggleAccessGroupStatus,
  deleteAccessGroup,
  getModuleSubmodules,
}
