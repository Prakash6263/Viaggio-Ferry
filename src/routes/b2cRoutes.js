const express = require("express")
const router = express.Router()
const b2cController = require("../controllers/b2cController")
const { verifyToken, extractUserId } = require("../middleware/authMiddleware")
const { asyncHandler } = require("../middleware/errorHandler")
const { verifyCompanyToken, extractCompanyId } = require("../middleware/authMiddleware")
const { b2cUserUpload } = require("../middleware/upload")

// ✅ Public Routes
router.post("/register", asyncHandler(b2cController.registerB2CUser))
router.get("/verify-email/:token", asyncHandler(b2cController.verifyEmailWithLink))
router.post("/verify-otp", asyncHandler(b2cController.verifyEmailWithOTP))
router.post("/resend-otp", asyncHandler(b2cController.resendVerificationOTP))
router.post("/login", asyncHandler(b2cController.loginB2CUser))

router.post("/forgot-password", asyncHandler(b2cController.forgotPasswordB2C))
router.post("/verify-reset-otp", asyncHandler(b2cController.verifyResetOTPB2C))
router.post("/reset-password", asyncHandler(b2cController.resetPasswordB2C))

// ✅ Protected Routes
router.get(
  "/profile",
  asyncHandler(verifyToken),
  asyncHandler(extractUserId),
  asyncHandler(b2cController.getB2CUserProfile),
)
router.put(
  "/profile",
  asyncHandler(verifyToken),
  asyncHandler(extractUserId),
  b2cUserUpload.single("profileImage"),
  asyncHandler(b2cController.updateB2CUserProfile),
)

router.patch(
  "/:userId/toggle-status",
  asyncHandler(verifyToken),
  asyncHandler(verifyCompanyToken),
  asyncHandler(extractCompanyId),
  asyncHandler(b2cController.toggleB2CUserStatus),
)

router.delete(
  "/:userId",
  asyncHandler(verifyToken),
  asyncHandler(verifyCompanyToken),
  asyncHandler(extractCompanyId),
  asyncHandler(b2cController.deleteB2CUser),
)

router.get(
  "/company/users",
  asyncHandler(verifyToken),
  asyncHandler(verifyCompanyToken),
  asyncHandler(extractCompanyId),
  asyncHandler(b2cController.getAllB2CUsersByCompany),
)

module.exports = router
        