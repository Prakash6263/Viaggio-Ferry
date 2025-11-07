const express = require("express")
const router = express.Router()
const {
  getAllFiscalYears,
  getFiscalYearDetails,
  createFiscalYear,
  updatePeriods,
  closePeriod,
  closeFiscalYear,
  getActivePeriod,
  deleteFiscalYear,
} = require("../controllers/fiscalYearController")
const { verifyCompanyToken, extractCompanyId } = require("../middleware/authMiddleware")
const {
  getAllFiscalYearsValidation,
  getFiscalYearDetailsValidation,
  createFiscalYearValidation,
  updatePeriodsValidation,
  closePeriodValidation,
  closeFiscalYearValidation,
  getActivePeriodValidation,
  deleteFiscalYearValidation,
} = require("../validators/fiscalYearValidators")

// All routes require company token and company ID extraction
router.use(verifyCompanyToken, extractCompanyId)

// Get all fiscal years
router.get("/:companyId/fiscal-years", getAllFiscalYearsValidation, getAllFiscalYears)

// Get fiscal year details
router.get("/:companyId/fiscal-years/:fiscalYearId", getFiscalYearDetailsValidation, getFiscalYearDetails)

// Create new fiscal year
router.post("/:companyId/fiscal-years", createFiscalYearValidation, createFiscalYear)

// Update periods in fiscal year
router.put("/:companyId/fiscal-years/:fiscalYearId/periods", updatePeriodsValidation, updatePeriods)

// Close specific period
router.put("/:companyId/fiscal-years/:fiscalYearId/periods/:periodId/close", closePeriodValidation, closePeriod)

// Close entire fiscal year
router.put("/:companyId/fiscal-years/:fiscalYearId/close", closeFiscalYearValidation, closeFiscalYear)

// Get active accounting period
router.get("/:companyId/active-period", getActivePeriodValidation, getActivePeriod)

// Delete fiscal year
router.delete("/:companyId/fiscal-years/:fiscalYearId", deleteFiscalYearValidation, deleteFiscalYear)

module.exports = router
