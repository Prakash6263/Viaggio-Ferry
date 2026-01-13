const createHttpError = require("http-errors")
const AccessGroup = require("../models/AccessGroup")

/**
 * Middleware to check if user has required permission
 *
 * Usage: router.post("/users", checkPermission("administration", "users", "canWrite"), createUser)
 *
 * @param {string} moduleCode - Module code (e.g., "administration")
 * @param {string} submoduleCode - Submodule code (e.g., "users")
 * @param {string} action - Permission action (canRead, canWrite, canEdit, canDelete)
 *
 * @returns {Function} Middleware function
 */
const checkPermission = (moduleCode, submoduleCode, action) => {
  return async (req, res, next) => {
    try {
      const { companyId, userId, user } = req

      if (!companyId || !userId) {
        throw createHttpError(401, "User not authenticated or company not identified")
      }

      let userAccessGroups = req.user?.accessGroups

      // If accessGroups is an array with objects containing moduleCode and accessGroupId
      if (Array.isArray(userAccessGroups) && userAccessGroups.length > 0) {
        // Find the access group for this specific module
        const groupForModule = userAccessGroups.find((ag) => ag.moduleCode === moduleCode)

        if (!groupForModule) {
          throw createHttpError(403, `User has no access group assigned for module '${moduleCode}'`)
        }

        userAccessGroups = groupForModule.accessGroupId
      } else {
        userAccessGroups = req.user?.accessGroupId
      }

      if (!userAccessGroups) {
        throw createHttpError(403, "User has no access group assigned")
      }

      // Find the user's access group
      const accessGroup = await AccessGroup.findOne({
        _id: userAccessGroups,
        company: companyId,
        isActive: true,
        isDeleted: false,
      })

      if (!accessGroup) {
        throw createHttpError(403, "Access group not found or inactive")
      }

      // Check if module matches
      if (accessGroup.moduleCode !== moduleCode) {
        throw createHttpError(403, `Access denied. Module '${moduleCode}' not permitted for this access group.`)
      }

      // Find the specific permission for this submodule
      const permission = accessGroup.permissions.find((p) => p.submoduleCode === submoduleCode)

      if (!permission) {
        throw createHttpError(403, `Access denied. No permissions for submodule '${submoduleCode}'`)
      }

      // Check if the required action is allowed
      if (!permission[action]) {
        throw createHttpError(403, `Access denied. Action '${action}' not permitted for '${submoduleCode}'`)
      }

      // Attach permission info to request for use in controller
      req.userPermission = {
        moduleCode,
        submoduleCode,
        action,
        permission,
      }

      next()
    } catch (error) {
      if (error.status) {
        return res.status(error.status).json({
          success: false,
          message: error.message,
        })
      }
      next(error)
    }
  }
}

/**
 * Middleware to check if user is company admin
 * Company admins can manage access groups
 * Changed from "company_admin" to "company" to match the auth middleware role structure
 */
const checkCompanyAdmin = async (req, res, next) => {
  try {
    const { user, companyId } = req

    if (user?.role !== "company") {
      throw createHttpError(403, "Access denied. Company role required.")
    }

    next()
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        message: error.message,
      })
    }
    next(error)
  }
}

module.exports = {
  checkPermission,
  checkCompanyAdmin,
}
