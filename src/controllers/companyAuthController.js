const jwt = require("jsonwebtoken")
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

// Register a new company
async function register(req, res) {
  handleValidation(req)

  const { companyName, registrationNumber, password, contact, operational, about, social } = req.body

  // Check if company already exists
  const existingCompany = await Company.findOne({ companyName })
  if (existingCompany) {
    const err = new Error("Company already registered")
    err.status = 409
    throw err
  }

  const companyData = {
    companyName,
    registrationNumber,
    password,
    contact,
    operational,
    about,
    social,
    status: "pending",
  }

  if (req.file) {
    companyData.logo = {
      dataBase64: req.file.buffer.toString("base64"),
      mimeType: req.file.mimetype,
    }
  }

  const company = await Company.create(companyData)

  res.status(201).json({
    message: "Company registered successfully. Awaiting superadmin approval.",
    company: {
      id: company._id,
      companyName: company.companyName,
      status: company.status,
    },
  })
}

// Company login
async function login(req, res) {
  handleValidation(req)

  const { companyName, password } = req.body

  const company = await Company.findOne({ companyName })
  if (!company) {
    const err = new Error("Company not found")
    err.status = 401
    throw err
  }

  // Check if company is approved
  if (company.status !== "approved") {
    const err = new Error(`Company status is ${company.status}. Cannot login.`)
    err.status = 403
    throw err
  }

  // Verify password
  const isPasswordValid = await company.comparePassword(password)
  if (!isPasswordValid) {
    const err = new Error("Invalid password")
    err.status = 401
    throw err
  }

  const token = jwt.sign(
    {
      id: company._id,
      companyId: company._id,
      companyName: company.companyName,
      role: "company",
    },
    process.env.JWT_SECRET || "your-secret-key",
    { expiresIn: "7d" },
  )

  res.json({
    message: "Login successful",
    token,
    company: {
      id: company._id,
      companyName: company.companyName,
      status: company.status,
    },
  })
}

// Get all approved companies (for dropdown in login)
async function getApprovedCompanies(req, res) {
  const companies = await Company.find({ status: "approved" }).select("_id companyName")

  res.json({
    companies,
  })
}

module.exports = { register, login, getApprovedCompanies }
