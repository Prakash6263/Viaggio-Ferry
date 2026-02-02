const express = require("express")
const {
  createUser,
  getAccessGroupsByModuleAndLayer,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getUsersByStatus,
  getSalesmanUsers,
  loginUser,
  getMyProfile,
  updateMyProfile,
  uploadProfileImage,
  deleteProfileImage
} = require("../controllers/userController")
const {
  assignAccessGroupToUser,
  getUserPermissionsForModule,
  getUserAccessGroups,
  removeAccessGroupFromUser,
} = require("../controllers/userAccessGroupController")
const { verifyToken, extractCompanyId, extractUserId } = require("../middleware/authMiddleware")
const { checkPermission } = require("../middleware/permissionMiddleware")
const { userProfileUpload } = require("../middleware/upload")

const router = express.Router()

// ==================== PUBLIC ROUTES (NO AUTH REQUIRED) ====================

/**
 * POST /api/users/login
 * User login endpoint - no authentication required
 */
router.post("/login", loginUser)

// ==================== PROTECTED ROUTES ====================
// Apply authentication middleware to all remaining routes
router.use(verifyToken)
router.use(extractCompanyId)
router.use(extractUserId)

// ==================== USER PROFILE ROUTES (SELF-SERVICE) ====================

/**
 * GET /api/users/me
 * Get own user profile - any authenticated user can access their own profile
 * Security: Uses JWT token identity, not URL params
 */
router.get("/me", getMyProfile)

/**
 * PUT /api/users/me/update
 * Update own user profile with optional profile image
 * Security: req.user.role must be "user", enforces self-update only
 * Allowed: fullName, position, remarks, agent, password, profileImage (file)
 * Blocked: email, company, role, layer, status, moduleAccess, isDeleted
 * Content-Type: application/x-www-form-urlencoded for JSON fields OR multipart/form-data for image upload
 */
router.put("/me/update", userProfileUpload.single("profileImage"), (req, res, next) => {
  // Set userId param to current user for updateMyProfile
  req.params.userId = (req.user.id || req.user.userId).toString()
  updateMyProfile(req, res, next)
})

/**
 * PUT /api/users/profile/:userId
 * User self-update via explicit userId with optional image - strict identity enforcement
 * Security: 
 *   - req.user.role MUST be "user"
 *   - req.params.userId MUST equal req.user.id
 *   - If mismatch → 403 Forbidden
 * Allowed: fullName, position, remarks, agent, password, profileImage (file)
 * Blocked: email, company, role, layer, status, moduleAccess, isDeleted
 */
router.put("/profile/:userId", userProfileUpload.single("profileImage"), updateMyProfile)

// ==================== USER MANAGEMENT ROUTES ====================

/**
 * POST /api/users
 * Create a new user - requires write permission on users
 */
router.post("/", checkPermission("administration", "users", "write"), createUser)

/**
 * GET /api/users
 * List all users - requires read permission on users
 */
router.get("/", checkPermission("administration", "users", "read"), getAllUsers)

/**
 * GET /api/users/salesman/list
 * List salesman users - requires read permission on users
 */
router.get("/salesman/list", checkPermission("administration", "users", "read"), getSalesmanUsers)

/**
 * GET /api/users/by-status/:status
 * Get users by status (Active/Inactive) - requires read permission on users
 */
router.get(
  "/by-status/:status",
  checkPermission("administration", "users", "read"),
  getUsersByStatus
)

/**
 * GET /api/users/:userId
 * Get individual user details - requires read permission on users
 */
router.get("/:userId", checkPermission("administration", "users", "read"), getUserById)

/**
 * PUT /api/users/:userId
 * Update user information - requires edit permission on users
 */
router.put("/:userId", checkPermission("administration", "users", "edit"), updateUser)

/**
 * DELETE /api/users/:userId
 * Delete user (soft delete) - requires delete permission on users submodule
 * 
 * Business Rules:
 * - Requires: administration:users:delete permission
 * - Cannot delete own account (403 Forbidden)
 * - Implements soft delete (isDeleted = true)
 * 
 * Response: Deleted user details with confirmation
 */
router.delete("/:userId", checkPermission("administration", "users", "delete"), deleteUser)

// ==================== ACCESS GROUP ASSIGNMENT ROUTES ====================

/**
 * GET /api/users/access-groups/by-module-layer
 * Get access groups for a specific module and layer - requires read permission on roles
 */
router.get(
  "/access-groups/by-module-layer",
  checkPermission("settings", "roles-permissions", "read"),
  getAccessGroupsByModuleAndLayer
)

/**
 * POST /api/users/:userId/assign-access-group
 * Assign access group to user - requires edit permission on roles
 */
router.post(
  "/:userId/assign-access-group",
  checkPermission("settings", "roles-permissions", "edit"),
  assignAccessGroupToUser
)

/**
 * GET /api/users/:userId/access-groups
 * Get all access groups assigned to user - requires read permission on roles
 */
router.get(
  "/:userId/access-groups",
  checkPermission("settings", "roles-permissions", "read"),
  getUserAccessGroups
)

/**
 * GET /api/users/:userId/permissions/:moduleCode
 * Get user permissions for a specific module - requires read permission on roles
 */
router.get(
  "/:userId/permissions/:moduleCode",
  checkPermission("settings", "roles-permissions", "read"),
  getUserPermissionsForModule
)

/**
 * DELETE /api/users/:userId/access-group/:moduleCode
 * Remove access group from user - requires delete permission on roles
 */
router.delete(
  "/:userId/access-group/:moduleCode",
  checkPermission("settings", "roles-permissions", "delete"),
  removeAccessGroupFromUser
)

module.exports = router
