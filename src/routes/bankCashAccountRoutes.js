const express = require("express")
const router = express.Router()
const bankCashAccountController = require("../controllers/bankCashAccountController")
const { verifyToken, extractCompanyId, extractUserId } = require("../middleware/authMiddleware")
const { checkPermission } = require("../middleware/permissionMiddleware")

// ==================== AUTHENTICATION MIDDLEWARE ====================
router.use(verifyToken)
router.use(extractCompanyId)
router.use(extractUserId)

// ==================== BANK/CASH ACCOUNT ROUTES ====================

/**
 * POST /api/bank-cash-accounts
 * Create Bank/Cash Account - requires write permission on bank-cash-accounts
 */
router.post(
  "/",
  checkPermission("finance", "bank-cash-accounts", "write"),
  bankCashAccountController.createBankCashAccount
)

/**
 * GET /api/bank-cash-accounts
 * List Bank/Cash Accounts - requires read permission on bank-cash-accounts
 */
router.get(
  "/",
  checkPermission("finance", "bank-cash-accounts", "read"),
  bankCashAccountController.listBankCashAccounts
)

/**
 * GET /api/bank-cash-accounts/:id
 * Get specific Account - requires read permission on bank-cash-accounts
 */
router.get(
  "/:id",
  checkPermission("finance", "bank-cash-accounts", "read"),
  bankCashAccountController.getBankCashAccountById
)

/**
 * PUT /api/bank-cash-accounts/:id
 * Update Account - requires edit permission on bank-cash-accounts
 */
router.put(
  "/:id",
  checkPermission("finance", "bank-cash-accounts", "edit"),
  bankCashAccountController.updateBankCashAccount
)

/**
 * DELETE /api/bank-cash-accounts/:id
 * Delete Account - requires delete permission on bank-cash-accounts
 */
router.delete(
  "/:id",
  checkPermission("finance", "bank-cash-accounts", "delete"),
  bankCashAccountController.deleteBankCashAccount
)

module.exports = router
