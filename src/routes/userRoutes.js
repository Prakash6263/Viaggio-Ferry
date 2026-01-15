const express = require("express")
const {
  createUser,
  getAccessGroupsByModuleAndLayer,
  getAllUsers,
  getUserById,
  updateUser,
  getUsersByStatus,
} = require("../controllers/userController")
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

// GET /api/users
// Get list of all users
router.get("/", getAllUsers)

// GET /api/users/by-status/:status
// Get users filtered by status (Active or Inactive)
router.get("/by-status/:status", getUsersByStatus)

// GET /api/users/:userId
// Get individual user by ID
router.get("/:userId", getUserById)

// POST /api/users
// Create a new user with automatic layer resolution and module access
router.post("/", createUser)

// GET /api/access-groups/by-module-layer
// Get active access groups for a specific module and layer combination
router.get("/access-groups/by-module-layer", getAccessGroupsByModuleAndLayer)

// POST /api/users/:userId/assign-access-group
// Assign access group to user for a specific module
router.post("/:userId/assign-access-group", assignAccessGroupToUser)

// GET /api/users/:userId/access-groups
// Get all access groups assigned to user across all modules
router.get("/:userId/access-groups", getUserAccessGroups)

// GET /api/users/:userId/permissions/:moduleCode
// Get user permissions for a specific module
router.get("/:userId/permissions/:moduleCode", getUserPermissionsForModule)

// PUT /api/users/:userId
// Update user information
router.put("/:userId", updateUser)

// DELETE /api/users/:userId/access-group/:moduleCode
// Remove access group assignment for specific module
router.delete("/:userId/access-group/:moduleCode", removeAccessGroupFromUser)

module.exports = router
