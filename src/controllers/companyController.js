const jwt = require("jsonwebtoken")
const createHttpError = require("http-errors")
const Company = require("../models/Company")

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
      throw createHttpError(
        400,
        "Missing required fields: companyName, loginEmail, password, emailAddress",
      )
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

    // Exclude sensitive fields from response
    const companyResponse = company.toObject()
    delete companyResponse.passwordHash
    delete companyResponse.loginEmail

    res.status(201).json({
      success: true,
      message: "Company registered successfully. Awaiting verification.",
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
      throw createHttpError(403, "Company account is inactive")
    }

    // Verify password
    const isPasswordValid = await company.comparePassword(password)
    if (!isPasswordValid) {
      throw createHttpError(401, "Invalid credentials")
    }

    // Generate JWT
    const token = jwt.sign(
      { companyId: company._id, id: company._id, role: "company_admin" },
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

// 9️⃣ Super Admin — Soft Delete Company
const deleteCompany = async (req, res, next) => {
  try {
    const { id } = req.params

    const company = await Company.findByIdAndUpdate(id, { isActive: false }, { new: true }).select(
      "-passwordHash -loginEmail",
    )

    if (!company) {
      throw createHttpError(404, "Company not found")
    }

    res.status(200).json({
      success: true,
      message: "Company deactivated successfully",
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
      throw createHttpError(
        400,
        "Missing required fields: companyName,loginEmail, password, emailAddress",
      )
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
}
