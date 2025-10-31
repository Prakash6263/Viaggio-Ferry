const express = require("express")
const router = express.Router()

const { asyncHandler } = require("../middleware/errorHandler")
const { verifySuperAdmin } = require("../middleware/authMiddleware")
const { rejectCompanyRules } = require("../validators/companyAuthValidators")
const controller = require("../controllers/superAdminCompanyController")

// Get all pending companies
router.get("/pending", verifySuperAdmin, asyncHandler(controller.getPendingCompanies))

// Get all companies
router.get("/", verifySuperAdmin, asyncHandler(controller.getAllCompanies))

// Approve a company
router.post("/:id/approve", verifySuperAdmin, asyncHandler(controller.approveCompany))

// Reject a company
router.post("/:id/reject", verifySuperAdmin, rejectCompanyRules, asyncHandler(controller.rejectCompany))

module.exports = router
