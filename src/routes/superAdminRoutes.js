const express = require("express")
const { body } = require("express-validator")
const controller = require("../controllers/superAdminController")
const { verifyToken, verifySuperAdmin } = require("../middleware/authMiddleware")
const { asyncHandler } = require("../middleware/errorHandler")

const router = express.Router()

// Login route (no auth required)
router.post(
  "/login",
  [
    body("email").isEmail().normalizeEmail().withMessage("Valid email is required"),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  asyncHandler(controller.login),
)

// Get profile (auth required)
router.get("/profile", verifyToken, verifySuperAdmin, asyncHandler(controller.getProfile))

// Logout (auth required)
router.post("/logout", verifyToken, verifySuperAdmin, asyncHandler(controller.logout))

module.exports = router
