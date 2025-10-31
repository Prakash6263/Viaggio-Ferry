const { validationResult } = require("express-validator")
const Company = require("../models/Company")

function handleValidation(req) {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    const err = new Error("Validation failed")
    err.status = 400
    err.details = errors.array()
    throw err
  }
}

// Get company dashboard overview
async function getDashboardOverview(req, res) {
  const companyId = req.user.id // From auth middleware

  const company = await Company.findById(companyId).select("-password")
  if (!company) {
    const err = new Error("Company not found")
    err.status = 404
    throw err
  }

  res.json({
    company: {
      id: company._id,
      companyName: company.companyName,
      status: company.status,
      registrationNumber: company.registrationNumber,
      contact: company.contact,
      operational: company.operational,
      about: company.about,
      social: company.social,
      createdAt: company.createdAt,
      updatedAt: company.updatedAt,
    },
  })
}

// Get company profile
async function getCompanyProfile(req, res) {
  const companyId = req.user.id

  const company = await Company.findById(companyId).select("-password")
  if (!company) {
    const err = new Error("Company not found")
    err.status = 404
    throw err
  }

  res.json(company)
}

// Update company profile
async function updateCompanyProfile(req, res) {
  handleValidation(req)

  const companyId = req.user.id
  const { contact, operational, about, social } = req.body

  const updateData = {}
  if (contact) updateData.contact = contact
  if (operational) updateData.operational = operational
  if (about) updateData.about = about
  if (social) updateData.social = social

  if (req.file) {
    updateData.logo = {
      dataBase64: req.file.buffer.toString("base64"),
      mimeType: req.file.mimetype,
    }
  }

  const company = await Company.findByIdAndUpdate(companyId, updateData, {
    new: true,
    runValidators: true,
  }).select("-password")

  if (!company) {
    const err = new Error("Company not found")
    err.status = 404
    throw err
  }

  res.json({
    message: "Company profile updated successfully",
    company,
  })
}

// Get company logo
async function getCompanyLogo(req, res) {
  const companyId = req.user.id

  const company = await Company.findById(companyId)
  if (!company || !company.logo || !company.logo.dataBase64) {
    const err = new Error("Logo not found")
    err.status = 404
    throw err
  }

  const buffer = Buffer.from(company.logo.dataBase64, "base64")
  res.setHeader("Content-Type", company.logo.mimeType || "image/png")
  res.setHeader("Content-Length", buffer.length)
  res.send(buffer)
}

// Change company password
async function changePassword(req, res) {
  handleValidation(req)

  const companyId = req.user.id
  const { currentPassword, newPassword } = req.body

  const company = await Company.findById(companyId)
  if (!company) {
    const err = new Error("Company not found")
    err.status = 404
    throw err
  }

  // Verify current password
  const isPasswordValid = await company.comparePassword(currentPassword)
  if (!isPasswordValid) {
    const err = new Error("Current password is incorrect")
    err.status = 401
    throw err
  }

  // Update password
  company.password = newPassword
  await company.save()

  res.json({
    message: "Password changed successfully",
  })
}

module.exports = {
  getDashboardOverview,
  getCompanyProfile,
  updateCompanyProfile,
  getCompanyLogo,
  changePassword,
}
