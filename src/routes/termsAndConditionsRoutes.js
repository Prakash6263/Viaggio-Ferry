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
const { verifyToken, verifyCompanyToken, verifySuperAdmin } = require("../middleware/authMiddleware")

const router = express.Router()

// Public route - Get published T&C for a company
router.get("/:companyId/published", getPublishedTermsAndConditions)

// Authenticated Company routes
router.get("/:companyId", verifyToken, verifyCompanyToken, getTermsAndConditions)
router.post("/:companyId/draft", verifyToken, verifyCompanyToken, saveDraft)
router.post("/:companyId/publish", verifyToken, verifyCompanyToken, publishTermsAndConditions)
router.patch("/:companyId/unpublish", verifyToken, verifyCompanyToken, unpublishTermsAndConditions)
router.delete("/:companyId", verifyToken, verifyCompanyToken, deleteTermsAndConditions)

// Super Admin route - View history/versions
router.get("/:companyId/history", verifySuperAdmin, getTermsAndConditionsHistory)

module.exports = router
