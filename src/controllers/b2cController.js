const createHttpError = require("http-errors")
const jwt = require("jsonwebtoken")
const crypto = require("crypto")
const fs = require("fs") // Imported fs for file management
const path = require("path") // Imported path for file paths
const B2CCustomer = require("../models/B2CCustomer")
const Company = require("../models/Company")
const {
  sendB2CVerificationEmail,
  sendB2CVerificationOTPEmail,
  sendB2CWelcomeEmail,
  sendForgotPasswordOTPEmail,
  sendPasswordResetSuccessEmail,
} = require("../utils/emailService")

// ✅ 1️⃣ Public — B2C User Signup
const registerB2CUser = async (req, res, next) => {
  try {
    const { name, email, phone, password, companyName } = req.body

    // Validate required fields
    if (!name || !email || !phone || !password) {
      throw createHttpError(400, "Missing required fields: name, email, phone, password")
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      throw createHttpError(400, "Invalid email format")
    }

    // Validate password strength (minimum 8 characters)
    if (password.length < 8) {
      throw createHttpError(400, "Password must be at least 8 characters long")
    }

    // Check if email already exists (global check)
    const existingUser = await B2CCustomer.findOne({ email: email.toLowerCase() })
    if (existingUser) {
      throw createHttpError(400, "Email is already registered")
    }

    let companyId = null
    if (companyName) {
      // Try to find company by companySlug or companyName (case-insensitive)
      const normalizedCompanyName = companyName.trim().toLowerCase()

      // First, try to find by slug (e.g., "prakash-corporate")
      let company = await Company.findOne({
        companySlug: normalizedCompanyName.replace(/\s+/g, "-"),
      })

      // If not found by slug, try by company name (e.g., "prakash corporate")
      if (!company) {
        company = await Company.findOne({
          companyName: { $regex: `^${normalizedCompanyName}$`, $options: "i" },
        })
      }

      // If still not found, try partial match on company name
      if (!company) {
        company = await Company.findOne({
          companyName: { $regex: normalizedCompanyName.split(/\s+/).join("|"), $options: "i" },
        })
      }

      if (!company) {
        throw createHttpError(404, `Company '${companyName}' not found. Please check the company name and try again.`)
      }

      // Check if company is active
      if (company.status !== "approved") {
        throw createHttpError(403, "The specified company is not approved yet. Please try again later.")
      }

      companyId = company._id
    }

    // Create new B2C customer
    const b2cUser = new B2CCustomer({
      name: name.trim(),
      email: email.toLowerCase(),
      phone: phone.trim(),
      password, // Will be hashed in pre-save hook (if implemented)
      company: companyId, // Set company ID from lookup
      status: "Pending", // Set to Pending until email is verified
      role: "ROLE_B2C_USER", // Auto-assign B2C role
    })

    // Generate email verification token (valid for 24 hours)
    const verificationToken = jwt.sign(
      { userId: b2cUser._id, type: "email_verification" },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "24h" },
    )

    // Generate OTP (6-digit code)
    const otp = Math.floor(100000 + Math.random() * 900000).toString()

    b2cUser.emailVerificationToken = verificationToken
    b2cUser.emailVerificationTokenExpires = new Date(Date.now() + 86400000) // 24 hours
    b2cUser.emailVerificationOTP = otp
    b2cUser.emailVerificationOTPExpires = new Date(Date.now() + 600000) // 10 minutes

    await b2cUser.save()

    // Send verification email with both link and OTP
    const emailResult = await sendB2CVerificationEmail(b2cUser, verificationToken)
    if (!emailResult.success) {
      console.error("Failed to send verification email:", emailResult.error)
    }

    // Send OTP email separately
    const otpResult = await sendB2CVerificationOTPEmail(b2cUser.email, otp, b2cUser.name)
    if (!otpResult.success) {
      console.error("Failed to send OTP email:", otpResult.error)
    }

    // Prepare response (exclude sensitive fields)
    const userResponse = b2cUser.toObject()
    delete userResponse.password
    delete userResponse.emailVerificationToken
    delete userResponse.emailVerificationOTP

    res.status(201).json({
      success: true,
      message: "B2C user registered successfully. Please check your email for verification instructions.",
      data: {
        userId: userResponse._id,
        name: userResponse.name,
        email: userResponse.email,
        role: userResponse.role,
        status: userResponse.status,
        companyId: userResponse.company,
      },
    })
  } catch (error) {
    next(error)
  }
}

// ✅ 2️⃣ Public — Verify Email with Link
const verifyEmailWithLink = async (req, res, next) => {
  try {
    const { token } = req.params

    // Verify and decode the token
    let decoded
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key")
    } catch (error) {
      throw createHttpError(400, "Invalid or expired verification link")
    }

    // Find user by ID and verify token matches
    const b2cUser = await B2CCustomer.findById(decoded.userId)
    if (!b2cUser) {
      throw createHttpError(404, "User not found")
    }

    // Check if token is valid
    if (b2cUser.emailVerificationToken !== token) {
      throw createHttpError(400, "Invalid verification token")
    }

    // Check if token has expired
    if (new Date() > b2cUser.emailVerificationTokenExpires) {
      throw createHttpError(400, "Verification link has expired")
    }

    // Check if already verified
    if (b2cUser.isEmailVerified) {
      return res.status(200).send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Already Verified</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              padding: 20px;
            }
            .container {
              background: white;
              border-radius: 16px;
              padding: 48px;
              max-width: 500px;
              width: 100%;
              text-align: center;
              box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
            }
            .icon {
              width: 80px;
              height: 80px;
              background: #dbeafe;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              margin: 0 auto 24px;
            }
            .icon svg { width: 40px; height: 40px; color: #2563eb; }
            h1 { color: #1e40af; font-size: 28px; margin-bottom: 16px; }
            p { color: #6b7280; font-size: 16px; line-height: 1.6; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
              </svg>
            </div>
            <h1>Already Verified</h1>
            <p>Your email has already been verified. You can now log in to your account.</p>
          </div>
        </body>
        </html>
      `)
    }

    // Mark email as verified
    b2cUser.isEmailVerified = true
    b2cUser.status = "Active" // Activate the account
    b2cUser.emailVerificationToken = undefined
    b2cUser.emailVerificationTokenExpires = undefined
    b2cUser.emailVerificationOTP = undefined
    b2cUser.emailVerificationOTPExpires = undefined

    await b2cUser.save()

    // Send welcome email
    const welcomeResult = await sendB2CWelcomeEmail(b2cUser)
    if (!welcomeResult.success) {
      console.error("Failed to send welcome email:", welcomeResult.error)
    }

    // Render success page
    res.status(200).send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Verified Successfully</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
          }
          .container {
            background: white;
            border-radius: 16px;
            padding: 48px;
            max-width: 500px;
            width: 100%;
            text-align: center;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          }
          .icon {
            width: 80px;
            height: 80px;
            background: #d1fae5;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 24px;
            animation: scaleIn 0.5s ease-out;
          }
          @keyframes scaleIn {
            0% { transform: scale(0); opacity: 0; }
            100% { transform: scale(1); opacity: 1; }
          }
          .icon svg { width: 40px; height: 40px; color: #059669; }
          h1 { color: #059669; font-size: 28px; margin-bottom: 16px; }
          p { color: #6b7280; font-size: 16px; line-height: 1.6; margin-bottom: 24px; }
          .button { display: inline-block; background-color: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; }
          .button:hover { background-color: #5568d3; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="icon">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
            </svg>
          </div>
          <h1>Email Verified Successfully!</h1>
          <p>Welcome! Your email has been verified. You can now log in to your account.</p>
          <a href="${process.env.FRONTEND_URL || "https://voyagian.com"}/login" class="button">Go to Login</a>
        </div>
      </body>
      </html>
    `)
  } catch (error) {
    next(error)
  }
}

// ✅ 3️⃣ Public — Verify Email with OTP
const verifyEmailWithOTP = async (req, res, next) => {
  try {
    const { email, otp } = req.body

    if (!email || !otp) {
      throw createHttpError(400, "Email and OTP are required")
    }

    // Find user by email
    const b2cUser = await B2CCustomer.findOne({ email: email.toLowerCase() })
    if (!b2cUser) {
      throw createHttpError(404, "User not found")
    }

    // Check if already verified
    if (b2cUser.isEmailVerified) {
      throw createHttpError(400, "Email is already verified")
    }

    // Verify OTP
    if (b2cUser.emailVerificationOTP !== otp) {
      throw createHttpError(400, "Invalid OTP")
    }

    // Check if OTP has expired
    if (new Date() > b2cUser.emailVerificationOTPExpires) {
      throw createHttpError(400, "OTP has expired. Please request a new one.")
    }

    // Mark email as verified
    b2cUser.isEmailVerified = true
    b2cUser.status = "Active"
    b2cUser.emailVerificationToken = undefined
    b2cUser.emailVerificationTokenExpires = undefined
    b2cUser.emailVerificationOTP = undefined
    b2cUser.emailVerificationOTPExpires = undefined

    await b2cUser.save()

    // Send welcome email
    const welcomeResult = await sendB2CWelcomeEmail(b2cUser)
    if (!welcomeResult.success) {
      console.error("Failed to send welcome email:", welcomeResult.error)
    }

    res.status(200).json({
      success: true,
      message: "Email verified successfully. You can now log in.",
      data: {
        userId: b2cUser._id,
        email: b2cUser.email,
        status: "Active",
      },
    })
  } catch (error) {
    next(error)
  }
}

// ✅ 4️⃣ Public — Resend Verification OTP
const resendVerificationOTP = async (req, res, next) => {
  try {
    const { email } = req.body

    if (!email) {
      throw createHttpError(400, "Email is required")
    }

    // Find user by email
    const b2cUser = await B2CCustomer.findOne({ email: email.toLowerCase() })
    if (!b2cUser) {
      throw createHttpError(404, "User not found")
    }

    // Check if already verified
    if (b2cUser.isEmailVerified) {
      throw createHttpError(400, "Email is already verified")
    }

    // Generate new OTP (6-digit code)
    const otp = Math.floor(100000 + Math.random() * 900000).toString()

    b2cUser.emailVerificationOTP = otp
    b2cUser.emailVerificationOTPExpires = new Date(Date.now() + 600000) // 10 minutes

    await b2cUser.save()

    // Send OTP email
    const otpResult = await sendB2CVerificationOTPEmail(b2cUser.email, otp, b2cUser.name)
    if (!otpResult.success) {
      console.error("Failed to send OTP email:", otpResult.error)
    }

    res.status(200).json({
      success: true,
      message: "OTP sent successfully. Check your email.",
    })
  } catch (error) {
    next(error)
  }
}

// ✅ 5️⃣ Public — B2C User Login
const loginB2CUser = async (req, res, next) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      throw createHttpError(400, "Email and password are required")
    }

    // Find user by email
    const b2cUser = await B2CCustomer.findOne({ email: email.toLowerCase() })
    if (!b2cUser) {
      throw createHttpError(401, "Invalid email or password")
    }

    // Check if email is verified
    if (!b2cUser.isEmailVerified) {
      throw createHttpError(403, "Please verify your email before logging in")
    }

    // Check if account is active
    if (b2cUser.status !== "Active") {
      throw createHttpError(403, "Your account is not active. Please contact support.")
    }

    // Check if deleted
    if (b2cUser.isDeleted) {
      throw createHttpError(401, "Invalid email or password")
    }

    const isPasswordValid = await b2cUser.comparePassword(password)
    if (!isPasswordValid) {
      throw createHttpError(401, "Invalid email or password")
    }

    // Update last login
    b2cUser.lastLogin = new Date()
    await b2cUser.save()

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: b2cUser._id,
        email: b2cUser.email,
        role: b2cUser.role,
        companyId: b2cUser.company,
        type: "b2c_user",
      },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "7d" },
    )

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        token,
        user: {
          userId: b2cUser._id,
          name: b2cUser.name,
          email: b2cUser.email,
          phone: b2cUser.phone,
          role: b2cUser.role,
          companyId: b2cUser.company,
        },
      },
    })
  } catch (error) {
    next(error)
  }
}

// ✅ 6️⃣ Protected — Get B2C User Profile
const getB2CUserProfile = async (req, res, next) => {
  try {
    const userId = req.userId

    const b2cUser = await B2CCustomer.findById(userId)
      .select("-password -emailVerificationToken -emailVerificationOTP")
      .populate("company", "companyName")

    if (!b2cUser) {
      throw createHttpError(404, "User not found")
    }

    res.status(200).json({
      success: true,
      data: b2cUser,
    })
  } catch (error) {
    next(error)
  }
}

// ✅ 7️⃣ Protected — Update B2C User Profile
const updateB2CUserProfile = async (req, res, next) => {
  try {
    const userId = req.userId
    const { name, phone, nationality, address, notes } = req.body

    const b2cUser = await B2CCustomer.findById(userId)
    if (!b2cUser) {
      throw createHttpError(404, "User not found")
    }

    if (req.file) {
      if (b2cUser.profileImage) {
        const oldImagePath = path.join(__dirname, "..", b2cUser.profileImage)
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath)
        }
      }
      b2cUser.profileImage = `/uploads/b2c-users/${req.file.filename}`
    }

    // Update only allowed fields
    if (name) b2cUser.name = name.trim()
    if (phone) b2cUser.phone = phone.trim()
    if (nationality) b2cUser.nationality = nationality.trim()
    if (address) {
      b2cUser.address = {
        street: address.street || b2cUser.address.street,
        city: address.city || b2cUser.address.city,
        country: address.country || b2cUser.address.country,
      }
    }
    if (notes) b2cUser.notes = notes.trim()

    await b2cUser.save()

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: b2cUser,
    })
  } catch (error) {
    next(error)
  }
}

// Password Reset Endpoints

// POST /api/b2c/forgot-password
// Send OTP to B2C user's email for password reset
const forgotPasswordB2C = async (req, res, next) => {
  try {
    const { email } = req.body

    if (!email) {
      throw createHttpError(400, "Email is required")
    }

    const b2cUser = await B2CCustomer.findOne({ email: email.toLowerCase() })
    if (!b2cUser) {
      throw createHttpError(404, "User with this email does not exist")
    }

    // Check if email is verified
    if (!b2cUser.isEmailVerified) {
      throw createHttpError(403, "Please verify your email first")
    }

    // Check if account is active
    if (b2cUser.status !== "Active") {
      throw createHttpError(403, "Your account is not active. Please contact support.")
    }

    // Generate OTP
    const otp = b2cUser.generateResetPasswordOTP()
    await b2cUser.save()

    const emailResult = await sendForgotPasswordOTPEmail(b2cUser.email, otp, b2cUser.name, "b2c")
    if (!emailResult.success) {
      console.error("Failed to send OTP email:", emailResult.error)
      throw createHttpError(500, "Failed to send OTP email. Please try again.")
    }

    res.json({
      success: true,
      message: "OTP has been sent to your email address",
    })
  } catch (error) {
    next(error)
  }
}

// POST /api/b2c/verify-reset-otp
// Verify OTP before allowing password reset
const verifyResetOTPB2C = async (req, res, next) => {
  try {
    const { email, otp } = req.body

    if (!email || !otp) {
      throw createHttpError(400, "Email and OTP are required")
    }

    // Find B2C user by email
    const b2cUser = await B2CCustomer.findOne({ email: email.toLowerCase() })
    if (!b2cUser) {
      throw createHttpError(401, "Invalid credentials")
    }

    // Verify OTP
    const isOTPValid = b2cUser.verifyResetPasswordOTP(otp)
    if (!isOTPValid) {
      throw createHttpError(401, "Invalid or expired OTP")
    }

    res.json({
      success: true,
      message: "OTP verified successfully. You can now reset your password.",
    })
  } catch (error) {
    next(error)
  }
}

// POST /api/b2c/reset-password
// Reset password using verified OTP
const resetPasswordB2C = async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body

    if (!email || !otp || !newPassword) {
      throw createHttpError(400, "Email, OTP, and new password are required")
    }

    // Validate new password strength
    if (newPassword.length < 8) {
      throw createHttpError(400, "New password must be at least 8 characters long")
    }

    // Find B2C user by email
    const b2cUser = await B2CCustomer.findOne({ email: email.toLowerCase() })
    if (!b2cUser) {
      throw createHttpError(401, "Invalid credentials")
    }

    // Verify OTP
    const isOTPValid = b2cUser.verifyResetPasswordOTP(otp)
    if (!isOTPValid) {
      throw createHttpError(401, "Invalid or expired OTP")
    }

    // Update password
    b2cUser.password = newPassword // Will be hashed by pre-save hook if implemented
    b2cUser.resetPasswordOTP = null
    b2cUser.resetPasswordExpires = null
    await b2cUser.save()

    // Send success email
    const emailResult = await sendPasswordResetSuccessEmail(b2cUser.email, b2cUser.name, "b2c")
    if (!emailResult.success) {
      console.error("Failed to send password reset success email:", emailResult.error)
    }

    res.json({
      success: true,
      message: "Password reset successfully. You can now login with your new password.",
    })
  } catch (error) {
    next(error)
  }
}

// PATCH /api/b2c/:userId/toggle-status
// Company admin can toggle B2C user status between Active and Inactive
const toggleB2CUserStatus = async (req, res, next) => {
  try {
    const { userId } = req.params
    const companyId = req.user.companyId || req.user.id

    // Find B2C user
    const b2cUser = await B2CCustomer.findById(userId)
    if (!b2cUser) {
      throw createHttpError(404, "B2C user not found")
    }

    // Verify that the company admin owns this user
    if (b2cUser.company.toString() !== companyId.toString()) {
      throw createHttpError(403, "You can only manage B2C users belonging to your company")
    }

    // Toggle status between Active and Inactive
    const newStatus = b2cUser.status === "Active" ? "Inactive" : "Active"
    b2cUser.status = newStatus

    await b2cUser.save()

    res.status(200).json({
      success: true,
      message: `B2C user status changed to ${newStatus} successfully`,
      data: {
        userId: b2cUser._id,
        email: b2cUser.email,
        name: b2cUser.name,
        status: b2cUser.status,
      },
    })
  } catch (error) {
    next(error)
  }
}

// DELETE /api/b2c/:userId
// Company admin can delete B2C users from their company
const deleteB2CUser = async (req, res, next) => {
  try {
    const { userId } = req.params
    const companyId = req.user.companyId || req.user.id

    // Find B2C user
    const b2cUser = await B2CCustomer.findById(userId)
    if (!b2cUser) {
      throw createHttpError(404, "B2C user not found")
    }

    // Verify that the company admin owns this user
    if (b2cUser.company.toString() !== companyId.toString()) {
      throw createHttpError(403, "You can only delete B2C users belonging to your company")
    }

    // Delete user profile image if exists
    if (b2cUser.profileImage) {
      const imagePath = path.join(__dirname, "..", b2cUser.profileImage)
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath)
      }
    }

    // Delete the user from database
    await B2CCustomer.findByIdAndDelete(userId)

    res.status(200).json({
      success: true,
      message: "B2C user deleted successfully",
      data: {
        deletedUserId: userId,
      },
    })
  } catch (error) {
    next(error)
  }
}

// ✅ 8️⃣ Protected — Get All B2C Users by Company
const getAllB2CUsersByCompany = async (req, res) => {
  try {
    const companyId = req.companyId
    const { status, page = 1, limit = 10, search } = req.query

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Company ID is required",
      })
    }

    // Build filter object
    const filter = { company: companyId }

    // Filter by status if provided
    if (status && ["Active", "Inactive", "Pending"].includes(status)) {
      filter.status = status
    }

    // Search by email or name
    if (search) {
      filter.$or = [
        { email: { $regex: search, $options: "i" } },
        { name: { $regex: search, $options: "i" } },
        { whatsappNumber: { $regex: search, $options: "i" } },
      ]
    }

    // Calculate pagination
    const pageNum = Math.max(1, Number.parseInt(page))
    const pageSize = Math.max(1, Math.min(100, Number.parseInt(limit)))
    const skip = (pageNum - 1) * pageSize

    // Get total count for pagination
    const totalCount = await B2CCustomer.countDocuments(filter)

    // Get users with pagination
    const users = await B2CCustomer.find(filter)
      .select("name company nationality whatsappNumber address status partner")
      .populate("company", "companyName") // Populate company name as "Partner"
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean()

    res.status(200).json({
      success: true,
      message: "B2C users retrieved successfully",
      data: users,
      pagination: {
        totalUsers: totalCount,
        currentPage: pageNum,
        pageSize: pageSize,
        totalPages: Math.ceil(totalCount / pageSize),
      },
    })
  } catch (error) {
    console.error("Error in getAllB2CUsersByCompany:", error)
    res.status(500).json({
      success: false,
      message: "Error retrieving B2C users",
      error: error.message,
    })
  }
}

module.exports = {
  registerB2CUser,
  verifyEmailWithLink,
  verifyEmailWithOTP,
  resendVerificationOTP,
  loginB2CUser,
  getB2CUserProfile,
  updateB2CUserProfile,
  forgotPasswordB2C,
  verifyResetOTPB2C,
  resetPasswordB2C,
  toggleB2CUserStatus,
  deleteB2CUser,
  getAllB2CUsersByCompany,
}
