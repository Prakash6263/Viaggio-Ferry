const express = require("express")
const router = express.Router()

const { upload } = require("../middleware/upload")
const { asyncHandler } = require("../middleware/errorHandler")
const { registerCompanyRules, loginCompanyRules } = require("../validators/companyAuthValidators")
const controller = require("../controllers/companyAuthController")

// Company registration
router.post("/register", upload.single("logo"), registerCompanyRules, asyncHandler(controller.register))

// Company login
router.post("/login", loginCompanyRules, asyncHandler(controller.login))

// Get approved companies (for dropdown)
router.get("/approved-companies", asyncHandler(controller.getApprovedCompanies))

module.exports = router
