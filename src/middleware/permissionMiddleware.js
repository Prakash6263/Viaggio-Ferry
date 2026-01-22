const createHttpError = require("http-errors")
const AccessGroup = require("../models/AccessGroup")
const User = require("../models/User")

/**
 * ENHANCED Middleware to check if user has required permission
 * 
 * This middleware:
 * 1. Verifies user is authenticated
 * 2. Loads user's access groups from database
 * 3. Checks if user has the required module and submodule access
 * 4. Validates the specific action permission (read, write, edit, delete)
 * 5. Attaches permission info to request for use in controller
 * 6. VALIDATES COMPANY MEMBERSHIP for user tokens
 *
 * Usage: router.post("/users", checkPermission("administration", "users", "write"), createUser)
 *
 * @param {string} moduleCode - Module code (e.g., "administration")
 * @param {string} submoduleCode - Submodule code (e.g., "users")
 * @param {string} action - Permission action (read, write, edit, delete)
 *
 * @returns {Function} Middleware function
 */
const checkPermission = (moduleCode, submoduleCode, action) => {
  return async (req, res, next) => {
    try {
      const { companyId, userId } = req
      const user = req.user
      const requestCompanyId = req.params.companyId // Get company ID from URL params

      // Validate authentication
      if (!companyId) {
        throw createHttpError(401, "Company ID not found in token")
      }

      // SECURITY: If URL contains a companyId, verify token companyId matches
      if (requestCompanyId && requestCompanyId !== companyId) {
        throw createHttpError(403, "Access denied. You cannot access resources from a different company.")
      }

      // Check if user is super admin - bypass all permission checks
      if (user?.role === "super_admin") {
        req.userPermission = {
          moduleCode,
          submoduleCode,
          action,
          isSuperAdmin: true,
        }
        return next()
      }

      // Handle company role (no userId available, but still validate company membership)
      if (user?.role === "company") {
        // Verify the companyId in token matches the company in database
        const Company = require("../models/Company")
        const company = await Company.findOne({
          _id: companyId,
          isDeleted: false,
        }).lean()

        if (!company) {
          throw createHttpError(403, "Company not found or access denied")
        }

        req.userPermission = {
          moduleCode,
          submoduleCode,
          action,
          isCompanyAdmin: true,
          hasFullAccess: true,
          companyId,
        }
        return next()
      }

      // For user roles: userId is required
      if (!userId) {
        throw createHttpError(401, "User ID not found in token. Please login again.")
      }

      // CRITICAL VALIDATION: Fetch user and verify company membership
      const dbUser = await User.findOne({
        _id: userId,
        company: companyId,
        isDeleted: false,
      }).lean()

      if (!dbUser) {
        throw createHttpError(403, "User not found, has been deleted, or does not belong to this company")
      }

      // Verify user's company matches the company in the URL
      if (requestCompanyId && requestCompanyId !== dbUser.company.toString()) {
        throw createHttpError(403, "Access denied. User does not belong to this company.")
      }

      // Regular users - strict permission checking
      if (!Array.isArray(dbUser.moduleAccess) || dbUser.moduleAccess.length === 0) {
        throw createHttpError(403, `User has no module access configured`)
      }

      const moduleAccessItem = dbUser.moduleAccess.find((ma) => ma.moduleCode === moduleCode)

      if (!moduleAccessItem) {
        throw createHttpError(403, `Access denied. No access to module '${moduleCode}'`)
      }

      const accessGroup = await AccessGroup.findOne({
        _id: moduleAccessItem.accessGroupId,
        company: companyId,
        moduleCode,
        isActive: true,
        isDeleted: false,
      }).lean()

      if (!accessGroup) {
        throw createHttpError(403, `Access group not found for module '${moduleCode}'`)
      }

      const permission = accessGroup.permissions?.find((p) => p.submoduleCode === submoduleCode)

      if (!permission) {
        throw createHttpError(403, `No permissions for '${submoduleCode}' in module '${moduleCode}'`)
      }

      const actionFieldName = `can${action.charAt(0).toUpperCase()}${action.slice(1)}`

      if (!permission[actionFieldName]) {
        throw createHttpError(403, `Not allowed to '${action}' in '${submoduleCode}'`)
      }

      req.userPermission = {
        moduleCode,
        submoduleCode,
        action,
        actionFieldName,
        permission,
        accessGroup: {
          _id: accessGroup._id,
          groupName: accessGroup.groupName,
          groupCode: accessGroup.groupCode,
          layer: accessGroup.layer,
        },
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
 * Company admins can manage users and access groups
 */
const checkCompanyAdmin = async (req, res, next) => {
  try {
    const { user, companyId } = req

    if (!user || !companyId) {
      throw createHttpError(401, "User not authenticated")
    }

    if (user?.role !== "company" && user?.role !== "super_admin") {
      throw createHttpError(403, "Access denied. Company or super admin role required.")
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

/**
 * Utility function to check if user has permission (can be used in controllers)
 * Returns true/false instead of throwing error
 * 
 * @param {Object} user - User object from request
 * @param {string} companyId - Company ID
 * @param {string} moduleCode - Module code
 * @param {string} submoduleCode - Submodule code
 * @param {string} action - Permission action (read, write, edit, delete)
 * @returns {Promise<boolean>}
 */
const hasPermission = async (user, companyId, moduleCode, submoduleCode, action) => {
  try {
    if (!user || !companyId) {
      return false
    }

    // Super admin always has permission
    if (user?.role === "super_admin") {
      return true
    }

    // Company role always has full access
    if (user?.role === "company") {
      return true
    }

    // User role requires database lookup
    const userId = user._id || user.id || user.userId
    if (!userId) {
      return false
    }

    const dbUser = await User.findOne({
      _id: userId,
      company: companyId,
      isDeleted: false,
    }).lean()

    if (!dbUser) {
      return false
    }

    const moduleAccessItem = dbUser.moduleAccess?.find((ma) => ma.moduleCode === moduleCode)
    if (!moduleAccessItem) {
      return false
    }

    const accessGroup = await AccessGroup.findOne({
      _id: moduleAccessItem.accessGroupId,
      company: companyId,
      moduleCode,
      isActive: true,
      isDeleted: false,
    }).lean()

    if (!accessGroup) {
      return false
    }

    const permission = accessGroup.permissions?.find((p) => p.submoduleCode === submoduleCode)
    if (!permission) {
      return false
    }

    const actionFieldName = `can${action.charAt(0).toUpperCase()}${action.slice(1)}`
    return permission[actionFieldName] === true
  } catch (error) {
    console.error("[v0] Permission check error:", error.message)
    return false
  }
}

module.exports = {
  checkPermission,
  checkCompanyAdmin,
  hasPermission,
}
