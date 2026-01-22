/**
 * SIDEBAR CONTROLLER
 * ==================
 * Provides sidebar menu structure based on user permissions.
 * Uses menuConfig.js as the single source of truth.
 * 
 * User → moduleAccess array (contains moduleCode + accessGroupId) → AccessGroup documents
 */

const User = require("../models/User")
const AccessGroup = require("../models/AccessGroup")
const Company = require("../models/Company")
const { buildMenuForContext, getAllModuleCodes, getSubmoduleCodesForModule, menuConfig } = require("../config/menuConfig")

const API_VERSION = "1.0"

exports.getSidebar = async (req, res) => {
  try {
    const userId = req.userId
    const companyId = req.companyId
    const userRole = req.user?.role

    // Validate auth requirements
    if (userRole !== "company" && !userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
        error: "Token missing or invalid",
      })
    }

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Missing company context",
      })
    }

    // ==================== COMPANY TOKEN FLOW ====================
    if (userRole === "company") {
      const company = await Company.findById(companyId).select("name logo")

      const menu = buildMenuForContext({
        role: "company",
        companyId,
      })

      return res.status(200).json({
        success: true,
        data: {
          menu,
          user: {
            id: companyId,
            name: company?.name || "Company",
            role: "company",
          },
          company: {
            id: companyId,
            name: company?.name || "Company",
            logo: company?.logo || null,
          },
          version: API_VERSION,
        },
      })
    }

    // ==================== USER TOKEN FLOW ====================
    // Load user with moduleAccess
    const user = await User.findById(userId)
      .select("fullName email layer moduleAccess")
      .lean()

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      })
    }

    // Get access group IDs from moduleAccess
    const accessGroupIds = (user.moduleAccess || [])
      .map((ma) => ma.accessGroupId)
      .filter(Boolean)

    // Load all access groups in parallel (performance optimization)
    const accessGroups = accessGroupIds.length > 0
      ? await AccessGroup.find({
          _id: { $in: accessGroupIds },
          company: companyId,
          isActive: true,
          isDeleted: false,
        }).lean()
      : []

    // Build menu from access groups
    const menu = buildMenuForContext({
      role: "user",
      accessGroups,
      companyId,
    })

    // Get company info
    const company = await Company.findById(companyId).select("name logo").lean()

    // Return response with stable contract
    res.status(200).json({
      success: true,
      data: {
        menu,
        user: {
          id: userId,
          name: user.fullName,
          role: "user",
        },
        company: {
          id: companyId,
          name: company?.name || "Company",
          logo: company?.logo || null,
        },
        version: API_VERSION,
      },
    })
  } catch (error) {
    console.error("[Sidebar Controller Error]:", error.message)
    res.status(500).json({
      success: false,
      message: "Error retrieving sidebar menu",
    })
  }
}

exports.validateSidebarConfig = async (req, res) => {
  try {
    const userRole = req.user?.role
    const companyId = req.companyId
    const userId = req.userId

    // Dev-only endpoint: company role only
    if (process.env.NODE_ENV === "production") {
      return res.status(403).json({
        success: false,
        message: "Debug endpoint disabled in production",
      })
    }

    if (userRole !== "company") {
      return res.status(403).json({
        success: false,
        message: "Only company role can access debug endpoint",
      })
    }

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Missing company context",
      })
    }

    // Build validation report
    const report = {
      environment: process.env.NODE_ENV || "development",
      apiVersion: API_VERSION,
      allModules: getAllModuleCodes(),
      moduleDetails: {},
    }

    // Add details for each module and its submodules
    for (const moduleCode of getAllModuleCodes()) {
      report.moduleDetails[moduleCode] = {
        submodules: getSubmoduleCodesForModule(moduleCode),
      }
    }

    res.status(200).json({
      success: true,
      data: report,
    })
  } catch (error) {
    console.error("[Sidebar Debug Error]:", error.message)
    res.status(500).json({
      success: false,
      message: "Error validating sidebar config",
    })
  }
}
