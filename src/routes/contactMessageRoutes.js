const express = require("express")
const router = express.Router()
const contactMessageController = require("../controllers/contactMessageController")
const { verifyToken, extractCompanyId, extractUserId } = require("../middleware/authMiddleware")
const { checkPermission } = require("../middleware/permissionMiddleware")

// ==================== PUBLIC ROUTE ====================
/**
 * POST /api/contact-messages/public/send
 * Public endpoint - Users send messages using company name or type
 * No authentication required
 */
router.post("/public/send", contactMessageController.sendPublicMessage)

// ==================== PROTECTED ROUTES ====================
router.use(verifyToken)
router.use(extractCompanyId)
router.use(extractUserId)

/**
 * GET /api/contact-messages/admin/messages
 * Protected endpoint - Admin fetch contact messages
 * Query params: ?status=New|InProgress|Closed (optional)
 * Requires read permission on contact-messages
 */
router.get(
  "/admin/messages",
  checkPermission("administration", "contact-messages", "read"),
  contactMessageController.getAdminMessages
)

/**
 * POST /api/contact-messages/admin/messages/:messageId/reply
 * Protected endpoint - Admin reply to a message
 * Requires write permission on contact-messages
 */
router.post(
  "/admin/messages/:messageId/reply",
  checkPermission("administration", "contact-messages", "write"),
  contactMessageController.replyToMessageAsAdmin
)

/**
 * GET /api/contact-messages/company/messages
 * Protected endpoint - Companies fetch their contact messages
 * Query params: ?status=New|InProgress|Closed (optional)
 * Requires read permission on contact-messages
 */
router.get(
  "/company/messages",
  checkPermission("administration", "contact-messages", "read"),
  contactMessageController.getCompanyMessages
)

/**
 * POST /api/contact-messages/company/messages/:messageId/reply
 * Protected endpoint - Companies reply to a message
 * Requires write permission on contact-messages
 */
router.post(
  "/company/messages/:messageId/reply",
  checkPermission("administration", "contact-messages", "write"),
  contactMessageController.replyToMessage
)

module.exports = router
