const createHttpError = require("http-errors")
const User = require("../models/User")
const AccessGroup = require("../models/AccessGroup")

/**
 * POST /api/users/:userId/assign-access-group
 * Assign an access group to a user for a specific module
 * 
 * Request body:
 * {
 *   moduleCode: string,      // e.g., "administration", "finance"
 *   accessGroupId: string    // MongoDB ObjectId of the AccessGroup
 * }
 */
const assignAccessGroupToUser = async (req, res, next) => {
  try {
    const { userId } = req.params
    const { moduleCode, accessGroupId } = req.body
    const { companyId } = req

    // Validate input
    if (!moduleCode || !accessGroupId) {
      throw createHttpError(400, "moduleCode and accessGroupId are required")
    }

    // Verify the access group exists and belongs to this company
    const accessGroup = await AccessGroup.findOne({
      _id: accessGroupId,
      company: companyId,
      moduleCode,
      isActive: true,
      isDeleted: false,
    })

    if (!accessGroup) {
      throw createHttpError(
        404,
        `Access group not found or inactive for module '${moduleCode}' in your company`
      )
    }

    // Find the user
    const user = await User.findOne({
      _id: userId,
      company: companyId,
      isDeleted: false,
    })

    if (!user) {
      throw createHttpError(404, "User not found in your company")
    }

    // Initialize moduleAccess array if it doesn't exist
    if (!user.moduleAccess) {
      user.moduleAccess = []
    }

    // Check if user already has an access group for this module
    const existingIndex = user.moduleAccess.findIndex((ma) => ma.moduleCode === moduleCode)

    if (existingIndex >= 0) {
      // Update existing module access
      user.moduleAccess[existingIndex].accessGroupId = accessGroupId
      console.log(`[v0] Updated existing access group for user ${userId} module ${moduleCode}`)
    } else {
      // Add new module access
      user.moduleAccess.push({
        moduleCode,
        accessGroupId,
      })
      console.log(`[v0] Assigned new access group to user ${userId} for module ${moduleCode}`)
    }

    await user.save()

    res.json({
      success: true,
      message: `Access group assigned to user for module '${moduleCode}'`,
      data: {
        userId: user._id,
        moduleCode,
        accessGroupId,
        groupName: accessGroup.groupName,
        permissions: accessGroup.permissions,
      },
    })
  } catch (error) {
    next(error)
  }
}

/**
 * GET /api/users/:userId/permissions/:moduleCode
 * Get user permissions for a specific module
 * Returns all submodule permissions for the module
 */
const getUserPermissionsForModule = async (req, res, next) => {
  try {
    const { userId, moduleCode } = req.params
    const { companyId } = req

    // Fetch user with moduleAccess
    const user = await User.findOne({
      _id: userId,
      company: companyId,
      isDeleted: false,
    }).lean()

    if (!user) {
      throw createHttpError(404, "User not found in your company")
    }

    // Find the access group assignment for this module
    const moduleAccessItem = user.moduleAccess?.find((ma) => ma.moduleCode === moduleCode)

    if (!moduleAccessItem) {
      throw createHttpError(404, `User has no access assigned for module '${moduleCode}'`)
    }

    // Fetch the access group details
    const accessGroup = await AccessGroup.findOne({
      _id: moduleAccessItem.accessGroupId,
      company: companyId,
      isActive: true,
      isDeleted: false,
    }).lean()

    if (!accessGroup) {
      throw createHttpError(404, `Access group not found for module '${moduleCode}'`)
    }

    res.json({
      success: true,
      data: {
        userId: user._id,
        fullName: user.fullName,
        email: user.email,
        moduleCode,
        accessGroup: {
          _id: accessGroup._id,
          groupName: accessGroup.groupName,
          groupCode: accessGroup.groupCode,
          layer: accessGroup.layer,
          permissions: accessGroup.permissions,
        },
      },
    })
  } catch (error) {
    next(error)
  }
}

/**
 * GET /api/users/:userId/access-groups
 * Get all access groups assigned to a user across all modules
 */
const getUserAccessGroups = async (req, res, next) => {
  try {
    const { userId } = req.params
    const { companyId } = req

    // Fetch user with moduleAccess
    const user = await User.findOne({
      _id: userId,
      company: companyId,
      isDeleted: false,
    }).lean()

    if (!user) {
      throw createHttpError(404, "User not found in your company")
    }

    if (!user.moduleAccess || user.moduleAccess.length === 0) {
      return res.json({
        success: true,
        data: {
          userId: user._id,
          fullName: user.fullName,
          email: user.email,
          layer: user.layer,
          moduleAccess: [],
        },
      })
    }

    // Fetch all access groups for this user
    const accessGroups = await AccessGroup.find({
      _id: { $in: user.moduleAccess.map((ma) => ma.accessGroupId) },
      company: companyId,
      isActive: true,
      isDeleted: false,
    }).lean()

    // Map access groups with module codes
    const moduleAccessWithDetails = user.moduleAccess.map((moduleAccess) => {
      const accessGroup = accessGroups.find((ag) => ag._id.toString() === moduleAccess.accessGroupId.toString())
      return {
        moduleCode: moduleAccess.moduleCode,
        accessGroupId: moduleAccess.accessGroupId,
        groupName: accessGroup?.groupName || "Unknown",
        groupCode: accessGroup?.groupCode || "Unknown",
        layer: accessGroup?.layer || "Unknown",
        permissions: accessGroup?.permissions || [],
      }
    })

    res.json({
      success: true,
      data: {
        userId: user._id,
        fullName: user.fullName,
        email: user.email,
        layer: user.layer,
        moduleAccess: moduleAccessWithDetails,
      },
    })
  } catch (error) {
    next(error)
  }
}

/**
 * DELETE /api/users/:userId/access-group/:moduleCode
 * Remove access group assignment for a specific module
 */
const removeAccessGroupFromUser = async (req, res, next) => {
  try {
    const { userId, moduleCode } = req.params
    const { companyId } = req

    // Find and update user
    const user = await User.findOne({
      _id: userId,
      company: companyId,
      isDeleted: false,
    })

    if (!user) {
      throw createHttpError(404, "User not found in your company")
    }

    // Check if user has this module access
    const hasModuleAccess = user.moduleAccess?.some((ma) => ma.moduleCode === moduleCode)

    if (!hasModuleAccess) {
      throw createHttpError(404, `User has no access assigned for module '${moduleCode}'`)
    }

    // Remove the access group for this module
    user.moduleAccess = user.moduleAccess.filter((ma) => ma.moduleCode !== moduleCode)

    await user.save()

    console.log(`[v0] Removed access group for user ${userId} module ${moduleCode}`)

    res.json({
      success: true,
      message: `Access group removed for module '${moduleCode}'`,
      data: {
        userId: user._id,
        removedModule: moduleCode,
        remainingModuleAccess: user.moduleAccess,
      },
    })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  assignAccessGroupToUser,
  getUserPermissionsForModule,
  getUserAccessGroups,
  removeAccessGroupFromUser,
}
