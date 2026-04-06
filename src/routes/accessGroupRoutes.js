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
const { checkPermission } = require("../middleware/permissionMiddleware")

const router = express.Router()

// ==================== AUTHENTICATION MIDDLEWARE ====================
router.use(verifyToken)
router.use(extractCompanyId)
router.use(extractUserId)

// ==================== ACCESS GROUP MANAGEMENT ROUTES ====================

/**
 * POST /api/access-groups
 * Create new access group - requires write permission on roles-permissions
 */
router.post("/", checkPermission("settings", "roles-permissions", "write"), createAccessGroup)

/**
 * GET /api/access-groups
 * Get list of access groups - requires read permission on roles-permissions
 */
router.get("/", checkPermission("settings", "roles-permissions", "read"), getAccessGroups)

/**
 * GET /api/access-groups/module/:moduleCode/submodules
 * Get available submodules for a module - requires read permission on roles-permissions
 */
router.get(
  "/module/:moduleCode/submodules",
  checkPermission("settings", "roles-permissions", "read"),
  getModuleSubmodules
)

/**
 * GET /api/access-groups/:id
 * Get single access group - requires read permission on roles-permissions
 */
router.get("/:id", checkPermission("settings", "roles-permissions", "read"), getAccessGroup)

/**
 * PUT /api/access-groups/:id
 * Update access group - requires edit permission on roles-permissions
 */
router.put("/:id", checkPermission("settings", "roles-permissions", "edit"), updateAccessGroup)

/**
 * PATCH /api/access-groups/:id/status
 * Toggle access group status - requires edit permission on roles-permissions
 */
router.patch(
  "/:id/status",
  checkPermission("settings", "roles-permissions", "edit"),
  toggleAccessGroupStatus
)

/**
 * DELETE /api/access-groups/:id
 * Delete access group (soft delete) - requires delete permission on roles-permissions
 */
router.delete("/:id", checkPermission("settings", "roles-permissions", "delete"), deleteAccessGroup)

module.exports = router
