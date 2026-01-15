const createHttpError = require("http-errors")
const User = require("../models/User")
const AccessGroup = require("../models/AccessGroup")

// POST /api/users/:userId/assign-access-group
// Assign an access group to a user for a specific module
const assignAccessGroupToUser = async (req, res, next) => {
  try {
    const { userId } = req.params
    const { moduleCode, accessGroupId } = req.body
    const { companyId } = req

    if (!moduleCode || !accessGroupId) {
      throw createHttpError(400, "moduleCode and accessGroupId are required")
    }

    // Validate the access group exists and belongs to this company
    const accessGroup = await AccessGroup.findOne({
      _id: accessGroupId,
      company: companyId,
      moduleCode,
    })

    if (!accessGroup) {
      throw createHttpError(404, `Access group not found for module '${moduleCode}'`)
    }

    let partnerId = req.body.partnerId || null
    if (accessGroup.layer === "company") {
      partnerId = companyId // Auto-assign companyId for company layer instead of null
    } else if (!partnerId) {
      throw createHttpError(400, `partnerId is required for layer '${accessGroup.layer}'`)
    }

    // Find user and update access groups
    const user = await User.findOne({
      _id: userId,
      company: companyId,
    })

    if (!user) {
      throw createHttpError(404, "User not found")
    }

    // Initialize accessGroups array if it doesn't exist
    if (!user.accessGroups) {
      user.accessGroups = []
    }

    // Check if user already has an access group for this module
    const existingGroupIndex = user.accessGroups.findIndex((ag) => ag.moduleCode === moduleCode)

    if (existingGroupIndex >= 0) {
      // Update existing
      user.accessGroups[existingGroupIndex].accessGroupId = accessGroupId
      user.accessGroups[existingGroupIndex].partnerId = partnerId
    } else {
      // Add new
      user.accessGroups.push({
        moduleCode,
        accessGroupId,
        partnerId,
      })
    }

    await user.save()

    res.json({
      success: true,
      message: `Access group assigned to user for module '${moduleCode}'`,
      data: {
        userId: user._id,
        accessGroups: user.accessGroups,
      },
    })
  } catch (error) {
    next(error)
  }
}

// GET /api/users/:userId/permissions/:moduleCode
// Get user permissions for a specific module
const getUserPermissionsForModule = async (req, res, next) => {
  try {
    const { userId, moduleCode } = req.params
    const { companyId } = req

    const user = await User.findOne({
      _id: userId,
      company: companyId,
    }).populate({
      path: "accessGroups.accessGroupId",
      model: "AccessGroup",
    })

    if (!user) {
      throw createHttpError(404, "User not found")
    }

    // Find the access group for this module
    const userModuleGroup = user.accessGroups.find((ag) => ag.moduleCode === moduleCode)

    if (!userModuleGroup) {
      throw createHttpError(404, `User has no access group assigned for module '${moduleCode}'`)
    }

    const accessGroup = userModuleGroup.accessGroupId

    res.json({
      success: true,
      data: {
        userId: user._id,
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

// GET /api/users/:userId/access-groups
// Get all access groups assigned to a user
const getUserAccessGroups = async (req, res, next) => {
  try {
    const { userId } = req.params
    const { companyId } = req

    const user = await User.findOne({
      _id: userId,
      company: companyId,
    }).populate({
      path: "accessGroups.accessGroupId",
      model: "AccessGroup",
    })

    if (!user) {
      throw createHttpError(404, "User not found")
    }

    res.json({
      success: true,
      data: {
        userId: user._id,
        fullName: user.fullName,
        email: user.email,
        accessGroups: user.accessGroups.map((ag) => ({
          moduleCode: ag.moduleCode,
          groupName: ag.accessGroupId?.groupName,
          groupCode: ag.accessGroupId?.groupCode,
          layer: ag.accessGroupId?.layer,
          permissions: ag.accessGroupId?.permissions,
        })),
      },
    })
  } catch (error) {
    next(error)
  }
}

// DELETE /api/users/:userId/access-group/:moduleCode
// Remove access group assignment for a specific module
const removeAccessGroupFromUser = async (req, res, next) => {
  try {
    const { userId, moduleCode } = req.params
    const { companyId } = req

    const user = await User.findOne({
      _id: userId,
      company: companyId,
    })

    if (!user) {
      throw createHttpError(404, "User not found")
    }

    // Remove the access group for this module
    user.moduleAccess = user.moduleAccess.filter((ag) => ag.moduleCode !== moduleCode)

    await user.save()

    res.json({
      success: true,
      message: `Access group removed for module '${moduleCode}'`,
      data: {
        userId: user._id,
        moduleAccess: user.moduleAccess,
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
