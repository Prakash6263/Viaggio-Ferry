const express = require("express")
const {
  registerCompany,
  loginCompany,
  listCompanies,
  getCompanyById,
  approveCompany,
  rejectCompany,
  getOwnProfile,
  updateOwnProfile,
  deleteCompany,
  adminAddCompany,
  confirmVerification,
  updateCompanyDetails,
  toggleCompanyStatus,
  sendVerificationLink,
  forgotPassword,
  verifyResetOTP,
  resetPassword,
  getCompanyPublicAboutByName,
  getCompanyContactByName,
  getCompanyBySlug,
} = require("../controllers/companyController")
const { verifyToken, verifySuperAdmin, verifyCompanyToken, extractCompanyId, extractUserId } = require("../middleware/authMiddleware")
const { checkPermission } = require("../middleware/permissionMiddleware")
const { companyLogoUpload, companyMultiUpload } = require("../middleware/upload")
const ledgerController = require("../controllers/ledgerController")

const router = express.Router()

// ==================== PUBLIC ROUTES (NO AUTH REQUIRED) ====================
router.post("/register", companyMultiUpload, registerCompany)
router.post("/login", loginCompany)
router.get("/confirm-verification/:token", confirmVerification)
router.post("/forgot-password", forgotPassword)
router.post("/verify-reset-otp", verifyResetOTP)
router.post("/reset-password", resetPassword)
router.get("/by-slug/:slug", getCompanyBySlug)
router.get("/public/about/:companyName", getCompanyPublicAboutByName)
router.get("/public/contact/:companyName", getCompanyContactByName)

// ==================== PROTECTED ROUTES ====================
router.use(verifyToken)
router.use(extractCompanyId)
router.use(extractUserId)

// ==================== COMPANY PROFILE ROUTES ====================

/**
 * GET /api/companies/me
 * Get own company profile - requires read permission on company-profile
 */
router.get(
  "/me",
  verifyCompanyToken,
  checkPermission("settings", "company-profile", "read"),
  getOwnProfile
)

/**
 * PUT /api/companies/:id
 * Update company details - requires edit permission on company-profile
 */
router.put(
  "/:id",
  companyMultiUpload,
  checkPermission("settings", "company-profile", "edit"),
  updateCompanyDetails
)

/**
 * GET /api/companies/ledgers
 * List company ledgers - requires read permission on chart-of-accounts (finance)
 */
router.get(
  "/ledgers",
  verifyCompanyToken,
  checkPermission("finance", "chart-of-accounts", "read"),
  ledgerController.listLedgers
)

// ==================== SUPER ADMIN ROUTES ====================

/**
 * GET /api/companies
 * List all companies - super admin only
 */
router.get("/", verifySuperAdmin, listCompanies)

/**
 * GET /api/companies/:id
 * Get specific company details - super admin only
 */
router.get("/:id", verifySuperAdmin, getCompanyById)

/**
 * POST /api/companies/admin/add
 * Admin add company - super admin only
 */
router.post("/admin/add", verifySuperAdmin, companyMultiUpload, adminAddCompany)

/**
 * PATCH /api/companies/:id/verify
 * Approve company - super admin only
 */
router.patch("/:id/verify", verifySuperAdmin, approveCompany)

/**
 * PATCH /api/companies/:id/reject
 * Reject company - super admin only
 */
router.patch("/:id/reject", verifySuperAdmin, rejectCompany)

/**
 * PATCH /api/companies/:id/toggle-status
 * Toggle company status - super admin only
 */
router.patch("/:id/toggle-status", verifySuperAdmin, toggleCompanyStatus)

/**
 * POST /api/companies/:id/send-verification
 * Send verification link - super admin only
 */
router.post("/:id/send-verification", verifySuperAdmin, sendVerificationLink)

/**
 * DELETE /api/companies/:id
 * Delete company - super admin only
 */
router.delete("/:id", verifySuperAdmin, deleteCompany)

module.exports = router
