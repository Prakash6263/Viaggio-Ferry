const express = require("express")
const router = express.Router()
const ledgerController = require("../controllers/ledgerController")
const { verifySuperAdmin, verifyAdminOrCompany, verifyToken, extractCompanyId, extractUserId } = require("../middleware/authMiddleware")
const { checkPermission } = require("../middleware/permissionMiddleware")

// Apply authentication to all routes except super admin routes
router.use(verifyToken)
router.use(extractCompanyId)
router.use(extractUserId)

// ==================== SUPER ADMIN ROUTES ====================

/**
 * POST /api/ledgers/admin
 * Create global ledger - super admin only - requires write permission on chart-of-accounts
 */
router.post(
  "/admin",
  verifySuperAdmin,
  checkPermission("finance", "chart-of-accounts", "write"),
  ledgerController.createLedger
)

/**
 * GET /api/ledgers/admin/allowed-types
 * Get allowed ledger types - requires read permission on chart-of-accounts
 */
router.get(
  "/admin/allowed-types",
  checkPermission("finance", "chart-of-accounts", "read"),
  ledgerController.getAllowedLedgerTypes
)

// ==================== COMPANY ROUTES ====================

/**
 * POST /api/ledgers/company
 * Create company ledger - requires write permission on chart-of-accounts
 */
router.post(
  "/company",
  checkPermission("finance", "chart-of-accounts", "write"),
  ledgerController.createCompanyLedger
)

// ==================== SHARED ROUTES ====================

/**
 * GET /api/ledgers
 * List all ledgers - requires read permission on chart-of-accounts
 */
router.get(
  "/",
  checkPermission("finance", "chart-of-accounts", "read"),
  ledgerController.listLedgers
)

/**
 * DELETE /api/ledgers/:id
 * Delete ledger - requires delete permission on chart-of-accounts
 */
router.delete(
  "/:id",
  checkPermission("finance", "chart-of-accounts", "delete"),
  ledgerController.deleteLedger
)

module.exports = router
