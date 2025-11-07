const express = require("express")
const router = express.Router()
const {
  getTrialBalance,
  getTrialBalanceSummary,
  refreshTrialBalance,
  exportTrialBalance,
  getTrialBalanceByType,
  getAccountTypes,
} = require("../controllers/trialBalanceController")
const { verifyCompanyToken, extractCompanyId } = require("../middleware/authMiddleware")
const {
  getTrialBalanceValidation,
  refreshTrialBalanceValidation,
  exportTrialBalanceValidation,
  getTrialBalanceSummaryValidation,
  getAccountTypesValidation,
} = require("../validators/trialBalanceValidators")

// All routes require company token and company ID extraction
router.use(verifyCompanyToken, extractCompanyId)

// Get trial balance with filters
router.get("/:companyId", getTrialBalanceValidation, getTrialBalance)

// Get trial balance summary (totals)
router.get("/:companyId/summary", getTrialBalanceSummaryValidation, getTrialBalanceSummary)

// Get trial balance grouped by account type
router.get("/:companyId/by-type", getTrialBalanceValidation, getTrialBalanceByType)

// Get account types for dropdown filter
router.get("/:companyId/filters/account-types", getAccountTypesValidation, getAccountTypes)

// Refresh trial balance from general ledger
router.post("/:companyId/refresh", refreshTrialBalanceValidation, refreshTrialBalance)

// Export trial balance to CSV
router.get("/:companyId/export/csv", exportTrialBalanceValidation, exportTrialBalance)

module.exports = router
