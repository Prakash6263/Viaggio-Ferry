const jwt = require("jsonwebtoken")
const createHttpError = require("http-errors")

const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1]

  if (!token) {
    throw createHttpError(401, "No token provided")
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key")
    req.user = decoded
    next()
  } catch (error) {
    throw createHttpError(401, "Invalid or expired token")
  }
}

const verifySuperAdmin = (req, res, next) => {
  verifyToken(req, res, () => {
    if (req.user.role !== "superadmin") {
      throw createHttpError(403, "Access denied. Superadmin role required.")
    }
    next()
  })
}

const verifyCompanyToken = (req, res, next) => {
  verifyToken(req, res, () => {
    if (req.user.role !== "company") {
      throw createHttpError(403, "Access denied. Company role required.")
    }
    next()
  })
}

const extractCompanyId = (req, res, next) => {
  try {
    const companyId = req.user?.companyId

    if (!companyId) {
      throw createHttpError(401, "Company ID not found in token. Please login again.")
    }

    // Attach companyId to request for use in controllers
    req.companyId = companyId

    next()
  } catch (error) {
    if (error.status) {
      throw error
    }
    throw createHttpError(500, "Error extracting company information")
  }
}

const extractUserId = (req, res, next) => {
  try {
    const userId = req.user?.id || req.user?.userId

    if (!userId) {
      throw createHttpError(401, "User ID not found in token. Please login again.")
    }

    // Attach userId to request for use in controllers
    req.userId = userId

    next()
  } catch (error) {
    if (error.status) {
      throw error
    }
    throw createHttpError(500, "Error extracting user information")
  }
}

module.exports = { verifyToken, verifySuperAdmin, verifyCompanyToken, extractCompanyId, extractUserId }
