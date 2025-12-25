const express = require("express")
const router = express.Router()
const contactMessageController = require("../controllers/contactMessageController")
const { verifyToken, verifyCompanyToken } = require("../middleware/authMiddleware")

// Public endpoint - Users send messages using company name or type
router.post("/public/send", contactMessageController.sendPublicMessage)

// Protected endpoint - Admin fetch their messages
router.get("/admin/messages", verifyToken, contactMessageController.getAdminMessages)

// Protected endpoint - Companies fetch their messages
router.get("/company/messages", verifyToken, verifyCompanyToken, contactMessageController.getCompanyMessages)

// Protected endpoint - Companies reply to a message
router.post(
  "/company/messages/:messageId/reply",
  verifyToken,
  verifyCompanyToken,
  contactMessageController.replyToMessage,
)

module.exports = router
