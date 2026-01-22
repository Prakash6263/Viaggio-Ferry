const express = require("express")
const {
  getTermsAndConditions,
  getPublishedTermsAndConditions,
  saveDraft,
  publishTermsAndConditions,
  unpublishTermsAndConditions,
  deleteTermsAndConditions,
  getTermsAndConditionsHistory,
} = require("../controllers/termsAndConditionsController")
const { verifyToken, verifySuperAdmin, extractCompanyId, extractUserId } = require("../middleware/authMiddleware")
const { checkPermission } = require("../middleware/permissionMiddleware")

const router = express.Router()

// ==================== PUBLIC ROUTE ====================
/**
 * GET /api/terms-and-conditions/:companyId/published
 * Public route - Get published Terms & Conditions for a company
 */
router.get("/:companyId/published", getPublishedTermsAndConditions)

// ==================== PROTECTED COMPANY ROUTES ====================
router.use(verifyToken)
router.use(extractCompanyId)
router.use(extractUserId)

/**
 * GET /api/terms-and-conditions/:companyId
 * Get company T&C - requires read permission on terms-conditions
 */
router.get(
  "/:companyId",
  checkPermission("administration", "terms-conditions", "read"),
  getTermsAndConditions
)

/**
 * POST /api/terms-and-conditions/:companyId/draft
 * Save T&C draft - requires write permission on terms-conditions
 */
router.post(
  "/:companyId/draft",
  checkPermission("administration", "terms-conditions", "write"),
  saveDraft
)

/**
 * POST /api/terms-and-conditions/:companyId/publish
 * Publish T&C - requires write permission on terms-conditions
 */
router.post(
  "/:companyId/publish",
  checkPermission("administration", "terms-conditions", "write"),
  publishTermsAndConditions
)

/**
 * PATCH /api/terms-and-conditions/:companyId/unpublish
 * Unpublish T&C - requires edit permission on terms-conditions
 */
router.patch(
  "/:companyId/unpublish",
  checkPermission("administration", "terms-conditions", "edit"),
  unpublishTermsAndConditions
)

/**
 * DELETE /api/terms-and-conditions/:companyId
 * Delete T&C - requires delete permission on terms-conditions
 * Note: This is a soft delete in practice
 */
router.delete(
  "/:companyId",
  checkPermission("administration", "terms-conditions", "delete"),
  deleteTermsAndConditions
)

// ==================== SUPER ADMIN ROUTE ====================
/**
 * GET /api/terms-and-conditions/:companyId/history
 * Super Admin route - View T&C history/versions
 * Only accessible to super admin users
 */
router.get("/:companyId/history", verifySuperAdmin, getTermsAndConditionsHistory)

module.exports = router
