const express = require("express")
const {
  createAccessGroup,
  getAccessGroups,
  getAccessGroup,
  updateAccessGroup,
  toggleAccessGroupStatus,
  deleteAccessGroup,
  getModuleSubmodules,
} = require("../controllers/accessGroupController")
const { verifyToken, extractCompanyId, extractUserId } = require("../middleware/authMiddleware")
const { checkCompanyAdmin } = require("../middleware/permissionMiddleware")

const router = express.Router()

// Middleware: Require authentication for all routes
router.use(verifyToken)
router.use(extractCompanyId)
router.use(extractUserId)
router.use(checkCompanyAdmin)

// Create new access group
router.post("/", createAccessGroup)

// Get list of access groups
router.get("/", getAccessGroups)

// Get available submodules for a module
router.get("/module/:moduleCode/submodules", getModuleSubmodules)

// Get single access group
router.get("/:id", getAccessGroup)

// Update access group
router.put("/:id", updateAccessGroup)

// Toggle access group status
router.patch("/:id/status", toggleAccessGroupStatus)

// Delete access group (soft delete)
router.delete("/:id", deleteAccessGroup)

module.exports = router
