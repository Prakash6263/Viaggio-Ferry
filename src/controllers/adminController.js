const jwt = require("jsonwebtoken")
const createHttpError = require("http-errors")
const path = require("path")
const fs = require("fs")
const Admin = require("../models/Admin")
const Company = require("../models/Company")
const { sendApprovalEmail, sendRejectionEmail } = require("../utils/emailService")

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"

// POST /api/admin/register-super-admin
// Register initial super admin (no auth required)
const registerSuperAdmin = async (req, res, next) => {
  try {
    const { name, email, password } = req.body

    if (!name || !email || !password) {
      throw createHttpError(400, "Name, email, and password are required")
    }

    // Check if any super admin already exists
    const existingAdmin = await Admin.findOne({ role: "super_admin" })
    if (existingAdmin) {
      throw createHttpError(400, "Super admin already registered. Use login endpoint.")
    }

    // Check if email already exists
    const emailExists = await Admin.findOne({ email: email.toLowerCase() })
    if (emailExists) {
      throw createHttpError(400, "Email already registered")
    }

    // Create new super admin
    const admin = new Admin({
      name,
      email: email.toLowerCase(),
      passwordHash: password,
      role: "super_admin",
      profileImage: req.file ? `/uploads/admin/${req.file.filename}` : null,
    })

    await admin.save()

    res.status(201).json({
      success: true,
      message: "Super admin registered successfully",
      data: admin.toJSON(),
    })
  } catch (error) {
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error("Error deleting file:", err)
      })
    }
    next(error)
  }
}

// POST /api/admin/login
// Authenticate super admin and return JWT
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      throw createHttpError(400, "Email and password are required")
    }

    // Find admin by email
    const admin = await Admin.findOne({ email: email.toLowerCase() })
    if (!admin) {
      throw createHttpError(401, "Invalid email or password")
    }

    // Check if admin role is super_admin
    if (admin.role !== "super_admin") {
      throw createHttpError(403, "Access denied. Super admin role required.")
    }

    // Verify password
    const isPasswordValid = await admin.comparePassword(password)
    if (!isPasswordValid) {
      throw createHttpError(401, "Invalid email or password")
    }

    // Check if admin is active
    if (!admin.isActive) {
      throw createHttpError(403, "Admin account is inactive")
    }

    // Update last login
    admin.lastLogin = new Date()
    await admin.save()

    // Generate JWT
    const token = jwt.sign(
      {
        userId: admin._id,
        email: admin.email,
        role: admin.role,
      },
      JWT_SECRET,
      { expiresIn: "24h" },
    )

    res.json({
      success: true,
      message: "Login successful",
      data: {
        admin: admin.toJSON(),
        token,
      },
    })
  } catch (error) {
    next(error)
  }
}

// GET /api/admin/companies
// List all companies with filtering
const listCompanies = async (req, res, next) => {
  try {
    const { status, search, page = 1, limit = 10 } = req.query
    const skip = (page - 1) * limit

    const filter = {}

    if (status) {
      filter.status = status
    }

    if (search) {
      filter.$or = [
        { companyName: { $regex: search, $options: "i" } },
        { loginEmail: { $regex: search, $options: "i" } },
        { registrationNumber: { $regex: search, $options: "i" } },
      ]
    }

    const companies = await Company.find(filter)
      .select("-passwordHash")
      .skip(skip)
      .limit(Number.parseInt(limit))
      .sort({ createdAt: -1 })

    const total = await Company.countDocuments(filter)

    res.json({
      success: true,
      data: companies,
      pagination: {
        page: Number.parseInt(page),
        limit: Number.parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    next(error)
  }
}

// GET /api/admin/companies/:id
// Get single company details
const getCompany = async (req, res, next) => {
  try {
    const { id } = req.params

    const company = await Company.findById(id).select("-passwordHash")
    if (!company) {
      throw createHttpError(404, "Company not found")
    }

    res.json({
      success: true,
      data: company,
    })
  } catch (error) {
    next(error)
  }
}

// PATCH /api/admin/companies/:id/verify
// Approve company registration
const verifyCompany = async (req, res, next) => {
  try {
    const { id } = req.params
    const { verificationNotes } = req.body

    const company = await Company.findById(id)
    if (!company) {
      throw createHttpError(404, "Company not found")
    }

    company.status = "approved"
    company.verifiedAt = new Date()
    company.verifiedBy = req.user.userId

    if (verificationNotes) {
      company.rejectionReason = verificationNotes
    }

    await company.save()

    const emailResult = await sendApprovalEmail(company)
    if (!emailResult.success) {
      console.error("Failed to send approval email:", emailResult.error)
    }

    res.json({
      success: true,
      message: "Company verified successfully",
      data: company,
      emailSent: emailResult.success,
    })
  } catch (error) {
    next(error)
  }
}

// PATCH /api/admin/companies/:id/reject
// Reject company registration
const rejectCompany = async (req, res, next) => {
  try {
    const { id } = req.params
    const { rejectionReason } = req.body

    if (!rejectionReason) {
      throw createHttpError(400, "Rejection reason is required")
    }

    const company = await Company.findById(id)
    if (!company) {
      throw createHttpError(404, "Company not found")
    }

    company.status = "rejected"
    company.rejectionReason = rejectionReason
    company.verifiedBy = req.user.userId

    await company.save()

    const emailResult = await sendRejectionEmail(company, rejectionReason)
    if (!emailResult.success) {
      console.error("Failed to send rejection email:", emailResult.error)
    }

    res.json({
      success: true,
      message: "Company rejected successfully",
      data: company,
      emailSent: emailResult.success,
    })
  } catch (error) {
    next(error)
  }
}

// DELETE /api/admin/companies/:id
// Soft delete company
const deleteCompany = async (req, res, next) => {
  try {
    const { id } = req.params

    const company = await Company.findById(id)
    if (!company) {
      throw createHttpError(404, "Company not found")
    }

    company.isActive = false
    await company.save()

    res.json({
      success: true,
      message: "Company deleted successfully",
      data: company,
    })
  } catch (error) {
    next(error)
  }
}

// PATCH /api/admin/companies/:id/toggle-status
// Enable or disable a company (prevents login when disabled)
const toggleCompanyStatus = async (req, res, next) => {
  try {
    const { id } = req.params
    const { isActive } = req.body

    if (typeof isActive !== "boolean") {
      throw createHttpError(400, "isActive field must be a boolean value")
    }

    const company = await Company.findById(id)
    if (!company) {
      throw createHttpError(404, "Company not found")
    }

    // Only allow toggling status for approved companies
    if (company.status !== "approved") {
      throw createHttpError(400, "Can only enable/disable approved companies")
    }

    company.isActive = isActive
    await company.save()

    res.json({
      success: true,
      message: isActive ? "Company enabled successfully" : "Company disabled successfully",
      data: {
        _id: company._id,
        companyName: company.companyName,
        isActive: company.isActive,
        status: company.status,
      },
    })
  } catch (error) {
    next(error)
  }
}

// GET /api/admin/profile
// Get current admin profile
const getProfile = async (req, res, next) => {
  try {
    const admin = await Admin.findById(req.user.userId)
    if (!admin) {
      throw createHttpError(404, "Admin not found")
    }

    res.json({
      success: true,
      data: admin.toJSON(),
    })
  } catch (error) {
    next(error)
  }
}

// PATCH /api/admin/profile
// Update admin profile with optional image upload
const updateProfile = async (req, res, next) => {
  try {
    const { name, email } = req.body
    const admin = await Admin.findById(req.user.userId)

    if (!admin) {
      throw createHttpError(404, "Admin not found")
    }

    if (name) admin.name = name
    if (email && email !== admin.email) {
      const emailExists = await Admin.findOne({ email: email.toLowerCase() })
      if (emailExists) {
        if (req.file) {
          fs.unlink(req.file.path, (err) => {
            if (err) console.error("Error deleting file:", err)
          })
        }
        throw createHttpError(400, "Email already in use")
      }
      admin.email = email.toLowerCase()
    }

    if (req.file) {
      // Delete old profile image if exists
      if (admin.profileImage) {
        const oldImagePath = path.join(__dirname, "../", admin.profileImage)
        fs.unlink(oldImagePath, (err) => {
          if (err) console.error("Error deleting old image:", err)
        })
      }
      admin.profileImage = `/uploads/admin/${req.file.filename}`
    }

    await admin.save()

    res.json({
      success: true,
      message: "Profile updated successfully",
      data: admin.toJSON(),
    })
  } catch (error) {
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error("Error deleting file:", err)
      })
    }
    next(error)
  }
}

module.exports = {
  registerSuperAdmin,
  login,
  getProfile,
  updateProfile,
  listCompanies,
  getCompany,
  verifyCompany,
  rejectCompany,
  deleteCompany,
  toggleCompanyStatus,
}
