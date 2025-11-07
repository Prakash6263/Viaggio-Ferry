const express = require("express")
const router = express.Router()
const {
  getGeneralLedger,
  getAccountLedger,
  getTrialBalance,
  exportLedger,
} = require("../controllers/generalLedgerController")
const { verifyCompanyToken, extractCompanyId } = require("../middleware/authMiddleware")
const {
  getGeneralLedgerValidation,
  getAccountLedgerValidation,
  getTrialBalanceValidation,
  exportLedgerValidation,
} = require("../validators/generalLedgerValidators")

// All routes require company token and company ID extraction
router.use(verifyCompanyToken, extractCompanyId)

router.get("/:companyId/general-ledger", getGeneralLedgerValidation, getGeneralLedger)
router.get("/:companyId/account-ledger/:ledgerId", getAccountLedgerValidation, getAccountLedger)
router.get("/:companyId/trial-balance", getTrialBalanceValidation, getTrialBalance)
router.get("/:companyId/export", exportLedgerValidation, exportLedger)

module.exports = router
