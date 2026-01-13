const express = require("express")
const {
  assignAccessGroupToUser,
  getUserPermissionsForModule,
  getUserAccessGroups,
  removeAccessGroupFromUser,
} = require("../controllers/userAccessGroupController")
const { verifyToken, extractCompanyId, extractUserId } = require("../middleware/authMiddleware")
const { checkCompanyAdmin } = require("../middleware/permissionMiddleware")

const router = express.Router()

// Middleware: Require authentication for all routes
router.use(verifyToken)
router.use(extractCompanyId)
router.use(extractUserId)
router.use(checkCompanyAdmin)

// POST /api/users/:userId/assign-access-group
// Assign access group to user for a specific module
router.post("/:userId/assign-access-group", assignAccessGroupToUser)

// GET /api/users/:userId/access-groups
// Get all access groups assigned to user across all modules
router.get("/:userId/access-groups", getUserAccessGroups)

// GET /api/users/:userId/permissions/:moduleCode
// Get user permissions for a specific module
router.get("/:userId/permissions/:moduleCode", getUserPermissionsForModule)

// DELETE /api/users/:userId/access-group/:moduleCode
// Remove access group assignment for specific module
router.delete("/:userId/access-group/:moduleCode", removeAccessGroupFromUser)

module.exports = router
