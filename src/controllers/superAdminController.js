const { validationResult } = require("express-validator")
const jwt = require("jsonwebtoken")
const createHttpError = require("http-errors")
const SuperAdmin = require("../models/SuperAdmin")

// Generate JWT Token
const generateToken = (superAdmin) => {
  return jwt.sign(
    {
      id: superAdmin._id,
      email: superAdmin.email,
      role: superAdmin.role,
    },
    process.env.JWT_SECRET || "your-secret-key",
    { expiresIn: "24h" },
  )
}

// SuperAdmin Login
async function login(req, res) {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: "Validation failed", details: errors.array() })
  }

  const { email, password } = req.body

  // Find superadmin by email
  const superAdmin = await SuperAdmin.findOne({ email, isDeleted: false })
  if (!superAdmin) {
    throw createHttpError(401, "Invalid email or password")
  }

  // Check if superadmin is active
  if (!superAdmin.isActive) {
    throw createHttpError(403, "SuperAdmin account is inactive")
  }

  // Compare passwords
  const isPasswordValid = await superAdmin.comparePassword(password)
  if (!isPasswordValid) {
    throw createHttpError(401, "Invalid email or password")
  }

  // Update last login
  superAdmin.lastLogin = new Date()
  await superAdmin.save()

  // Generate token
  const token = generateToken(superAdmin)

  res.json({
    message: "Login successful",
    token,
    superAdmin: superAdmin.toJSON(),
  })
}

// Get current superadmin profile
async function getProfile(req, res) {
  const superAdmin = await SuperAdmin.findById(req.user.id)
  if (!superAdmin) {
    throw createHttpError(404, "SuperAdmin not found")
  }
  res.json(superAdmin.toJSON())
}

// Logout (optional - mainly for frontend to clear token)
async function logout(req, res) {
  res.json({ message: "Logout successful" })
}

module.exports = { login, getProfile, logout }
