const createHttpError = require("http-errors")
const ContactMessage = require("../models/ContactMessage")
const Company = require("../models/Company")
const Admin = require("../models/Admin") // Added Admin model import
const { sendContactReplyEmail } = require("../utils/emailService") // Added email service import

// POST /api/contact-messages/public/send
// Public endpoint for users to send a message to a company or admin
const sendPublicMessage = async (req, res, next) => {
  try {
    const { fullName, email, subject, message, companyName, recipientType } = req.body

    if (!fullName || !email || !message) {
      throw createHttpError(400, "Full Name, Email, and Message are required")
    }

    const type = recipientType === "admin" ? "admin" : companyName ? "company" : "admin"

    let companyId = null
    if (type === "company") {
      if (!companyName) throw createHttpError(400, "Company Name is required for company messages")

      const normalizedName = companyName.trim().replace(/-/g, " ")

      const company = await Company.findOne({
        $or: [
          // Try exact match with original name
          { companyName: { $regex: new RegExp(`^${companyName.trim()}$`, "i") } },
          // Try match with normalized name (hyphens converted to spaces)
          { companyName: { $regex: new RegExp(`^${normalizedName}$`, "i") } },
        ],
      })

      if (!company) throw createHttpError(404, "Company not found")
      companyId = company._id
    }

    const newMessage = new ContactMessage({
      company: companyId,
      recipientType: type,
      fullName,
      email: email.toLowerCase(),
      subject,
      message,
    })

    await newMessage.save()

    res.status(201).json({
      success: true,
      message: "Message sent successfully",
      data: newMessage,
    })
  } catch (error) {
    next(error)
  }
}

// GET /api/contact-messages/company/messages
// Protected endpoint for companies to fetch their contact messages
const getCompanyMessages = async (req, res, next) => {
  try {
    const companyId = req.user.companyId || req.user.userId || req.user.id
    const { status } = req.query

    const query = {
      company: companyId,
      recipientType: "company",
      isDeleted: false,
    }

    if (status) {
      const validStatuses = ["New", "InProgress", "Closed"]
      if (!validStatuses.includes(status)) {
        throw createHttpError(400, `Invalid status. Must be one of: ${validStatuses.join(", ")}`)
      }
      query.status = status
    }

    const messages = await ContactMessage.find(query).sort({ createdAt: -1 })

    res.json({
      success: true,
      data: messages,
    })
  } catch (error) {
    next(error)
  }
}

// GET /api/contact-messages/admin/messages
// Protected endpoint for admins to fetch their messages
const getAdminMessages = async (req, res, next) => {
  try {
    const { status } = req.query

    const query = {
      recipientType: "admin",
      isDeleted: false,
    }

    if (status) {
      const validStatuses = ["New", "InProgress", "Closed"]
      if (!validStatuses.includes(status)) {
        throw createHttpError(400, `Invalid status. Must be one of: ${validStatuses.join(", ")}`)
      }
      query.status = status
    }

    const messages = await ContactMessage.find(query).sort({ createdAt: -1 })

    res.json({
      success: true,
      data: messages,
    })
  } catch (error) {
    next(error)
  }
}

const adminReplyToMessage = async (req, res, next) => {
  try {
    const { messageId } = req.params
    const { reply } = req.body
    const adminId = req.user.userId

    if (!reply) {
      throw createHttpError(400, "Reply message is required")
    }

    // Admins can reply to any message, but usually those with recipientType 'admin'
    const contactMessage = await ContactMessage.findById(messageId)
    if (!contactMessage) {
      throw createHttpError(404, "Message not found")
    }

    const admin = await Admin.findById(adminId)
    if (!admin) {
      throw createHttpError(404, "Admin details not found")
    }

    // For admin replies, we use the site name/admin name as companyName
    await sendContactReplyEmail(
      contactMessage.email,
      contactMessage.fullName,
      process.env.SITE_NAME || "Admin Support",
      admin.email,
      contactMessage.subject,
      reply,
    )

    contactMessage.status = "Closed"
    contactMessage.internalNotes = reply
    await contactMessage.save()

    res.json({
      success: true,
      message: "Admin reply sent successfully",
    })
  } catch (error) {
    next(error)
  }
}

const replyToMessage = async (req, res, next) => {
  try {
    const { messageId } = req.params
    const { reply } = req.body
    const companyId = req.user.companyId || req.user.userId || req.user.id

    if (!reply) {
      throw createHttpError(400, "Reply message is required")
    }

    const contactMessage = await ContactMessage.findOne({ _id: messageId, company: companyId })
    if (!contactMessage) {
      throw createHttpError(404, "Message not found")
    }

    const company = await Company.findById(companyId)
    if (!company) {
      throw createHttpError(404, "Company details not found")
    }

    await sendContactReplyEmail(
      contactMessage.email,
      contactMessage.fullName,
      company.companyName,
      company.emailAddress, // Using business email as reply-to
      contactMessage.subject,
      reply,
    )

    contactMessage.status = "Closed"
    contactMessage.internalNotes = reply
    await contactMessage.save()

    res.json({
      success: true,
      message: "Reply sent successfully",
    })
  } catch (error) {
    next(error)
  }
}

// POST /api/contact-messages/admin/messages/:messageId/reply
// Protected endpoint for admins to reply to a message
const replyToMessageAsAdmin = async (req, res, next) => {
  try {
    const { messageId } = req.params
    const { reply } = req.body
    const adminId = req.user.userId || req.user.id

    if (!reply) {
      throw createHttpError(400, "Reply message is required")
    }

    // Find message that is addressed to admin
    const contactMessage = await ContactMessage.findOne({
      _id: messageId,
      recipientType: "admin",
    })

    if (!contactMessage) {
      throw createHttpError(404, "Message not found")
    }

    // Get admin details
    const admin = await Admin.findById(adminId)
    if (!admin) {
      throw createHttpError(404, "Admin details not found")
    }

    // Send reply email using admin details
    await sendContactReplyEmail(
      contactMessage.email,
      contactMessage.fullName,
      admin.name, // Admin name as sender
      admin.email, // Admin email as reply-to
      contactMessage.subject,
      reply,
    )

    contactMessage.status = "Closed"
    contactMessage.internalNotes = reply
    await contactMessage.save()

    res.json({
      success: true,
      message: "Reply sent successfully",
    })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  sendPublicMessage,
  getCompanyMessages,
  getAdminMessages, // exported admin controller
  replyToMessage,
  replyToMessageAsAdmin, // Export new admin reply function
}
