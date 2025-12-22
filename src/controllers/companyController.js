const jwt = require("jsonwebtoken")
const createHttpError = require("http-errors")
const Company = require("../models/Company")
const { sendApprovalEmail, sendVerificationEmail } = require("../utils/emailService")

// 1️⃣ Public — Register Company
const registerCompany = async (req, res, next) => {
  try {
    const {
      // Required fields
      companyName,
      loginEmail,
      password,
      // Basic Company Information
      dateEstablished,
      taxVatNumber, // ✅ NEW
      // Contact Details
      address,
      city,
      country,
      postalCode,
      mainPhoneNumber,
      emailAddress,
      website,
      // Operational Details
      defaultCurrency,
      applicableTaxes, // ✅ NEW
      operatingPorts,
      operatingCountries, // ✅ NEW
      timeZone, // ✅ NEW
      workingHours,
      // About Us
      whoWeAre,
      vision,
      mission,
      purpose,
      // Social Network Links
      facebookUrl,
      instagramUrl,
      whatsappNumber,
      linkedinProfile,
      skypeId,
    } = req.body

    if (!companyName || !loginEmail || !password || !emailAddress) {
      throw createHttpError(400, "Missing required fields: companyName, loginEmail, password, emailAddress")
    }

    // Check if company already exists
    const existingCompany = await Company.findOne({ loginEmail: loginEmail.toLowerCase() })
    if (existingCompany) {
      throw createHttpError(400, "Company with this email already exists")
    }

    let logoUrl = null
    if (req.file) {
      logoUrl = `/uploads/companies/${req.file.filename}`
    }

    const company = new Company({
      companyName,
      loginEmail: loginEmail.toLowerCase(),
      passwordHash: password,
      logoUrl,
      dateEstablished,
      taxVatNumber, // ✅ Save field
      address,
      city,
      country,
      postalCode,
      mainPhoneNumber,
      emailAddress,
      website,
      defaultCurrency,
      applicableTaxes, // ✅ Save field (array or string – Mongoose will handle if frontend sends array)
      operatingPorts,
      operatingCountries, // ✅ Save field
      timeZone, // ✅ Save field
      workingHours,
      whoWeAre,
      vision,
      mission,
      purpose,
      facebookUrl,
      instagramUrl,
      whatsappNumber,
      linkedinProfile,
      skypeId,
      status: "pending",
    })

    await company.save()

    // Generate verification token
    const verificationToken = jwt.sign({ companyId: company._id }, process.env.JWT_SECRET || "your-secret-key", {
      expiresIn: "1h",
    })

    // Update company with verification token
    company.verificationToken = verificationToken
    company.verificationTokenExpires = new Date(Date.now() + 3600000) // 1 hour from now
    await company.save()

    // Send verification email
    const emailResult = await sendVerificationEmail(company)
    if (!emailResult.success) {
      console.error("Failed to send verification email:", emailResult.error)
    }

    // Exclude sensitive fields from response
    const companyResponse = company.toObject()
    delete companyResponse.passwordHash
    delete companyResponse.loginEmail
    delete companyResponse.verificationToken
    delete companyResponse.verificationTokenExpires

    res.status(201).json({
      success: true,
      message: "Company registered successfully. Please check your email for verification instructions.",
      data: companyResponse,
    })
  } catch (error) {
    next(error)
  }
}

// 2️⃣ Public — Login Company
const loginCompany = async (req, res, next) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      throw createHttpError(400, "Email and password are required")
    }

    const company = await Company.findOne({ loginEmail: email.toLowerCase() })
    if (!company) {
      throw createHttpError(401, "Invalid credentials")
    }

    // Check status
    if (company.status === "pending") {
      throw createHttpError(403, "Company is not verified yet")
    }

    if (company.status === "rejected") {
      throw createHttpError(403, "Company registration was rejected")
    }

    if (!company.isActive) {
      throw createHttpError(403, "Company account has been disabled by administrator. Please contact support.")
    }

    // Verify password
    const isPasswordValid = await company.comparePassword(password)
    if (!isPasswordValid) {
      throw createHttpError(401, "Invalid credentials")
    }

    // Generate JWT
    const token = jwt.sign(
      { companyId: company._id, id: company._id, role: "company" },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "24h" },
    )

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: { token, companyId: company._id },
    })
  } catch (error) {
    next(error)
  }
}

// 3️⃣ Super Admin — List Companies (pagination + filtering)
const listCompanies = async (req, res, next) => {
  try {
    const { status, search, page = 1, limit = 10 } = req.query

    const filter = {}

    if (status) {
      filter.status = status
    }

    if (search) {
      filter.$or = [
        { companyName: { $regex: search, $options: "i" } },
        { emailAddress: { $regex: search, $options: "i" } },
      ]
    }

    const skip = (page - 1) * limit
    const companies = await Company.find(filter)
      .select("-passwordHash -loginEmail -verifiedBy -rejectionReason")
      .skip(skip)
      .limit(Number.parseInt(limit))
      .sort({ createdAt: -1 })

    const total = await Company.countDocuments(filter)

    res.status(200).json({
      success: true,
      message: "Companies retrieved successfully",
      data: {
        companies,
        pagination: {
          total,
          page: Number.parseInt(page),
          limit: Number.parseInt(limit),
          pages: Math.ceil(total / limit),
        },
      },
    })
  } catch (error) {
    next(error)
  }
}

// 4️⃣ Super Admin — Get Single Company
const getCompanyById = async (req, res, next) => {
  try {
    const { id } = req.params

    const company = await Company.findById(id).select("-passwordHash -loginEmail")
    if (!company) {
      throw createHttpError(404, "Company not found")
    }

    res.status(200).json({
      success: true,
      message: "Company retrieved successfully",
      data: company,
    })
  } catch (error) {
    next(error)
  }
}

// 5️⃣ Super Admin — Approve Company
const approveCompany = async (req, res, next) => {
  try {
    const { id } = req.params

    const company = await Company.findByIdAndUpdate(
      id,
      {
        status: "approved",
        verifiedBy: req.user.id || req.user.userId,
        verifiedAt: new Date(),
      },
      { new: true },
    ).select("-passwordHash -loginEmail")

    if (!company) {
      throw createHttpError(404, "Company not found")
    }

    res.status(200).json({
      success: true,
      message: "Company approved successfully",
      data: company,
    })
  } catch (error) {
    next(error)
  }
}

// 6️⃣ Super Admin — Reject Company
const rejectCompany = async (req, res, next) => {
  try {
    const { id } = req.params
    const { reason } = req.body

    const company = await Company.findByIdAndUpdate(
      id,
      {
        status: "rejected",
        verifiedBy: req.user.id || req.user.userId,
        rejectionReason: reason || null,
      },
      { new: true },
    ).select("-passwordHash -loginEmail")

    if (!company) {
      throw createHttpError(404, "Company not found")
    }

    res.status(200).json({
      success: true,
      message: "Company rejected successfully",
      data: company,
    })
  } catch (error) {
    next(error)
  }
}

// 7️⃣ Company — Get Own Profile
const getOwnProfile = async (req, res, next) => {
  try {
    const companyId = req.user.companyId || req.user.id

    const company = await Company.findById(companyId).select("-passwordHash")
    if (!company) {
      throw createHttpError(404, "Company not found")
    }

    res.status(200).json({
      success: true,
      message: "Profile retrieved successfully",
      data: company,
    })
  } catch (error) {
    next(error)
  }
}

// 8️⃣ Company — Update Own Profile
const updateOwnProfile = async (req, res, next) => {
  try {
    const companyId = req.user.companyId || req.user.id
    const { passwordHash, status, verifiedBy, verifiedAt, loginEmail, ...editableData } = req.body

    if (req.file) {
      editableData.logoUrl = `/uploads/companies/${req.file.filename}`
    }

    const company = await Company.findByIdAndUpdate(companyId, editableData, {
      new: true,
      runValidators: true,
    }).select("-passwordHash")

    if (!company) {
      throw createHttpError(404, "Company not found")
    }

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: company,
    })
  } catch (error) {
    next(error)
  }
}

// 🔟 Super Admin — Add Company (Admin Registration)
const adminAddCompany = async (req, res, next) => {
  try {
    const {
      // Required fields
      companyName,
      loginEmail,
      password,
      // Basic Company Information
      dateEstablished,
      taxVatNumber, // ✅ NEW
      // Contact Details
      address,
      city,
      country,
      postalCode,
      mainPhoneNumber,
      emailAddress,
      website,
      // Operational Details
      defaultCurrency,
      applicableTaxes, // ✅ NEW
      operatingPorts,
      operatingCountries, // ✅ NEW
      timeZone, // ✅ NEW
      workingHours,
      // About Us
      whoWeAre,
      vision,
      mission,
      purpose,
      // Social Network Links
      facebookUrl,
      instagramUrl,
      whatsappNumber,
      linkedinProfile,
      skypeId,
      approveNow = false,
    } = req.body

    if (!companyName || !loginEmail || !password || !emailAddress) {
      throw createHttpError(400, "Missing required fields: companyName,loginEmail, password, emailAddress")
    }

    // Check if company already exists
    const existingCompany = await Company.findOne({ loginEmail: loginEmail.toLowerCase() })
    if (existingCompany) {
      throw createHttpError(400, "Company with this email already exists")
    }

    let logoUrl = null
    if (req.file) {
      logoUrl = `/uploads/companies/${req.file.filename}`
    }

    const company = new Company({
      companyName,
      loginEmail: loginEmail.toLowerCase(),
      passwordHash: password,
      logoUrl,
      dateEstablished,
      taxVatNumber, // ✅ Save field
      address,
      city,
      country,
      postalCode,
      mainPhoneNumber,
      emailAddress,
      website,
      defaultCurrency,
      applicableTaxes, // ✅ Save field
      operatingPorts,
      operatingCountries, // ✅ Save field
      timeZone, // ✅ Save field
      workingHours,
      whoWeAre,
      vision,
      mission,
      purpose,
      facebookUrl,
      instagramUrl,
      whatsappNumber,
      linkedinProfile,
      skypeId,
      status: approveNow ? "approved" : "pending",
      verifiedBy: approveNow ? req.user.id || req.user.userId : null,
      verifiedAt: approveNow ? new Date() : null,
    })

    await company.save()

    // Exclude sensitive fields from response
    const companyResponse = company.toObject()
    delete companyResponse.passwordHash
    delete companyResponse.loginEmail

    res.status(201).json({
      success: true,
      message: approveNow
        ? "Company created and approved successfully by admin"
        : "Company created successfully. Awaiting verification.",
      data: companyResponse,
    })
  } catch (error) {
    next(error)
  }
}

// Super Admin — Delete Company
const deleteCompany = async (req, res, next) => {
  try {
    const { id } = req.params

    const company = await Company.findByIdAndDelete(id)
    if (!company) {
      throw createHttpError(404, "Company not found")
    }

    res.status(200).json({
      success: true,
      message: "Company deleted successfully",
    })
  } catch (error) {
    next(error)
  }
}

// Super Admin — Update Company Details
const updateCompanyDetails = async (req, res, next) => {
  try {
    const { id } = req.params

    // Fields that can be updated
    const {
      // Basic Company Information
      taxVatNumber,
      dateEstablished,
      // Contact Details
      address,
      city,
      country,
      postalCode,
      mainPhoneNumber,
      emailAddress,
      website,
      // Operational Details
      defaultCurrency,
      applicableTaxes,
      operatingPorts,
      operatingCountries,
      timeZone,
      workingHours,
      // About Us
      whoWeAre,
      vision,
      mission,
      purpose,
      // Social Network Links
      facebookUrl,
      instagramUrl,
      whatsappNumber,
      linkedinProfile,
      skypeId,
      // Login Email (can be updated by admin)
      loginEmail,
      // Company Name
      companyName,
    } = req.body

    // Build update object with only provided fields
    const updateData = {}

    if (taxVatNumber !== undefined) updateData.taxVatNumber = taxVatNumber
    if (dateEstablished !== undefined) updateData.dateEstablished = dateEstablished
    if (address !== undefined) updateData.address = address
    if (city !== undefined) updateData.city = city
    if (country !== undefined) updateData.country = country
    if (postalCode !== undefined) updateData.postalCode = postalCode
    if (mainPhoneNumber !== undefined) updateData.mainPhoneNumber = mainPhoneNumber
    if (emailAddress !== undefined) updateData.emailAddress = emailAddress
    if (website !== undefined) updateData.website = website
    if (defaultCurrency !== undefined) updateData.defaultCurrency = defaultCurrency
    if (applicableTaxes !== undefined) updateData.applicableTaxes = applicableTaxes
    if (operatingPorts !== undefined) updateData.operatingPorts = operatingPorts
    if (operatingCountries !== undefined) updateData.operatingCountries = operatingCountries
    if (timeZone !== undefined) updateData.timeZone = timeZone
    if (workingHours !== undefined) updateData.workingHours = workingHours
    if (whoWeAre !== undefined) updateData.whoWeAre = whoWeAre
    if (vision !== undefined) updateData.vision = vision
    if (mission !== undefined) updateData.mission = mission
    if (purpose !== undefined) updateData.purpose = purpose
    if (facebookUrl !== undefined) updateData.facebookUrl = facebookUrl
    if (instagramUrl !== undefined) updateData.instagramUrl = instagramUrl
    if (whatsappNumber !== undefined) updateData.whatsappNumber = whatsappNumber
    if (linkedinProfile !== undefined) updateData.linkedinProfile = linkedinProfile
    if (skypeId !== undefined) updateData.skypeId = skypeId
    if (companyName !== undefined) updateData.companyName = companyName

    // Handle loginEmail separately to check for duplicates
    if (loginEmail !== undefined) {
      const existingCompany = await Company.findOne({
        loginEmail: loginEmail.toLowerCase(),
        _id: { $ne: id },
      })
      if (existingCompany) {
        throw createHttpError(400, "Another company with this login email already exists")
      }
      updateData.loginEmail = loginEmail.toLowerCase()
    }

    // Handle logo upload
    if (req.file) {
      updateData.logoUrl = `/uploads/companies/${req.file.filename}`
    }

    if (Object.keys(updateData).length === 0) {
      throw createHttpError(400, "No valid fields provided for update")
    }

    const company = await Company.findByIdAndUpdate(id, updateData, { new: true, runValidators: true }).select(
      "-passwordHash",
    )

    if (!company) {
      throw createHttpError(404, "Company not found")
    }

    res.status(200).json({
      success: true,
      message: "Company details updated successfully",
      data: company,
    })
  } catch (error) {
    next(error)
  }
}

// GET /api/companies/confirm-verification/:token
// Public route - Company clicks this link from email to confirm verification
const confirmVerification = async (req, res, next) => {
  try {
    const { token } = req.params

    // Find company by verification token
    const company = await Company.findOne({
      verificationToken: token,
      verificationTokenExpires: { $gt: new Date() },
    })

    if (!company) {
      // Render error HTML page
      return res.status(400).send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verification Failed</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
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
              background: #fee2e2;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              margin: 0 auto 24px;
            }
            .icon svg { width: 40px; height: 40px; color: #dc2626; }
            h1 { color: #dc2626; font-size: 28px; margin-bottom: 16px; }
            p { color: #6b7280; font-size: 16px; line-height: 1.6; margin-bottom: 24px; }
            .support { font-size: 14px; color: #9ca3af; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </div>
            <h1>Verification Failed</h1>
            <p>This verification link is invalid or has expired. Please contact the administrator to request a new verification link.</p>
            <p class="support">If you need assistance, please contact our support team.</p>
          </div>
        </body>
        </html>
      `)
    }

    // Check if already verified
    if (company.status === "approved") {
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
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
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
            p { color: #6b7280; font-size: 16px; line-height: 1.6; margin-bottom: 24px; }
            .company-name { font-weight: 600; color: #1f2937; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <h1>Already Verified</h1>
            <p>Your company <span class="company-name">${company.companyName}</span> has already been verified. You can now log in to your account.</p>
          </div>
        </body>
        </html>
      `)
    }

    // Update company status to approved
    company.status = "approved"
    company.verifiedAt = new Date()
    company.verificationToken = undefined
    company.verificationTokenExpires = undefined
    company.verificationPending = false

    await company.save()

    // Send approval confirmation email
    const emailResult = await sendApprovalEmail(company)
    if (!emailResult.success) {
      console.error("Failed to send approval email after verification:", emailResult.error)
    }

    // Render success HTML page
    res.status(200).send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verification Successful</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
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
          .company-name { font-weight: 600; color: #1f2937; }
          .details {
            background: #f9fafb;
            border-radius: 12px;
            padding: 20px;
            margin: 24px 0;
            text-align: left;
          }
          .details h3 { font-size: 14px; color: #6b7280; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.05em; }
          .details ul { list-style: none; }
          .details li { padding: 8px 0; border-bottom: 1px solid #e5e7eb; font-size: 14px; color: #374151; }
          .details li:last-child { border-bottom: none; }
          .details strong { color: #111827; }
          .note {
            background: #eff6ff;
            border: 1px solid #bfdbfe;
            border-radius: 8px;
            padding: 16px;
            font-size: 14px;
            color: #1e40af;
          }
          .checkmark {
            display: inline-block;
            animation: checkmark 0.8s ease-in-out;
          }
          @keyframes checkmark {
            0% { stroke-dashoffset: 100; }
            100% { stroke-dashoffset: 0; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="icon">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path class="checkmark" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
            </svg>
          </div>
          <h1>Verification Successful!</h1>
          <p>Congratulations! Your company <span class="company-name">${company.companyName}</span> has been successfully verified.</p>
          
          <div class="details">
            <h3>Company Details</h3>
            <ul>
              <li><strong>Company Name:</strong> ${company.companyName}</li>
              <li><strong>Registration Number:</strong> ${company.registrationNumber}</li>
              <li><strong>Verified On:</strong> ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</li>
            </ul>
          </div>

          <div class="note">
            <strong>What's next?</strong><br>
            A confirmation email has been sent to your registered email address. You can now log in to your account and start using our services.
          </div>
        </div>
      </body>
      </html>
    `)
  } catch (error) {
    next(error)
  }
}

// Super Admin — Toggle Company Status
const toggleCompanyStatus = async (req, res, next) => {
  try {
    const { id } = req.params

    const company = await Company.findById(id)
    if (!company) {
      throw createHttpError(404, "Company not found")
    }

    company.isActive = !company.isActive
    await company.save()

    res.status(200).json({
      success: true,
      message: `Company status toggled to ${company.isActive ? "active" : "inactive"} successfully`,
      data: company,
    })
  } catch (error) {
    next(error)
  }
}

// Super Admin — Send Verification Link
const sendVerificationLink = async (req, res, next) => {
  try {
    const { id } = req.params

    const company = await Company.findById(id)
    if (!company) {
      throw createHttpError(404, "Company not found")
    }

    // Generate verification token
    const verificationToken = jwt.sign({ companyId: company._id }, process.env.JWT_SECRET || "your-secret-key", {
      expiresIn: "1h",
    })

    // Update company with verification token
    company.verificationToken = verificationToken
    company.verificationTokenExpires = new Date(Date.now() + 3600000) // 1 hour from now
    await company.save()

    // Send verification email
    const emailResult = await sendVerificationEmail(company)
    if (!emailResult.success) {
      console.error("Failed to send verification email:", emailResult.error)
    }

    res.status(200).json({
      success: true,
      message: "Verification link sent successfully",
    })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  registerCompany,
  loginCompany,
  listCompanies,
  getCompanyById,
  approveCompany,
  rejectCompany,
  getOwnProfile,
  updateOwnProfile,
  deleteCompany,
  adminAddCompany,
  confirmVerification,
  toggleCompanyStatus,
  sendVerificationLink,
  updateCompanyDetails,
}
