const express = require("express")
const router = express.Router()

const { upload } = require("../middleware/upload")
const { asyncHandler } = require("../middleware/errorHandler")
const { verifyCompanyToken } = require("../middleware/authMiddleware")
const { updateCompanyProfileRules, changePasswordRules } = require("../validators/companyDashboardValidators")
const controller = require("../controllers/companyDashboardController")

// All routes require company authentication
router.use(verifyCompanyToken)

// Get dashboard overview
router.get("/overview", asyncHandler(controller.getDashboardOverview))

// Get company profile
router.get("/profile", asyncHandler(controller.getCompanyProfile))

// Update company profile
router.patch(
  "/profile",
  upload.single("logo"),
  updateCompanyProfileRules,
  asyncHandler(controller.updateCompanyProfile),
)

// Get company logo
router.get("/logo", asyncHandler(controller.getCompanyLogo))

// Change password
router.post("/change-password", changePasswordRules, asyncHandler(controller.changePassword))

module.exports = router
