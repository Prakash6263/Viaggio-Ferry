// const jwt = require("jsonwebtoken")
// const createHttpError = require("http-errors")

// const verifyToken = (req, res, next) => {
//   const token = req.headers.authorization?.split(" ")[1]

//   if (!token) {
//     throw createHttpError(401, "No token provided")
//   }

//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key")
    
//     // Standardize the token structure
//     // The JWT payload from smart login system contains:
//     // - id: userId or companyId
//     // - role: "user" or "company"
//     // - email: user/company email
//     // - companyId: always present
//     // - layer: user layer (optional for companies)
//     // - moduleAccess: array of module access (optional for companies)
    
//     req.user = {
//       id: decoded.id,
//       role: decoded.role,
//       email: decoded.email,
//       companyId: decoded.companyId,
//       layer: decoded.layer || undefined,
//       moduleAccess: decoded.moduleAccess || [],
//     }
    
//     // Attach companyId separately for backward compatibility
//     req.companyId = decoded.companyId
    
//     next()
//   } catch (error) {
//     throw createHttpError(401, "Invalid or expired token")
//   }
// }

// const verifySuperAdmin = (req, res, next) => {
//   verifyToken(req, res, () => {
//     if (req.user.role !== "super_admin") {
//       throw createHttpError(403, "Access denied. Super admin role required.")
//     }
//     next()
//   })
// }

// const verifyAdminOrCompany = (req, res, next) => {
//   verifyToken(req, res, () => {
//     if (req.user.role !== "super_admin" && req.user.role !== "company") {
//       throw createHttpError(403, "Access denied. Admin or company role required.")
//     }
//     next()
//   })
// }

// const verifyCompanyToken = (req, res, next) => {
//   verifyToken(req, res, () => {
//     if (req.user.role !== "company") {
//       throw createHttpError(403, "Access denied. Company role required.")
//     }
//     next()
//   })
// }

// const extractCompanyId = (req, res, next) => {
//   try {
//     // For company login: companyId is the company's MongoDB ID
//     // For user login: companyId is the company the user belongs to
//     const companyId = req.user?.companyId

//     if (!companyId) {
//       throw createHttpError(401, "Company ID not found in token. Please login again.")
//     }

//     // Attach companyId to request for use in controllers
//     req.companyId = companyId

//     next()
//   } catch (error) {
//     if (error.status) {
//       throw error
//     }
//     throw createHttpError(500, "Error extracting company information")
//   }
// }

// const extractUserId = (req, res, next) => {
//   try {
//     // CRITICAL FIX:
//     // For company role: userId should be null/undefined (it's a company, not a user)
//     // For user role: userId is from req.user.userId or req.user.id
//     const userId = req.user?.userId || req.user?.id

//     if (!userId) {
//       // Only throw error if user is not company role
//       // Company roles don't have a userId because they ARE the company
//       if (req.user?.role !== "company") {
//         throw createHttpError(401, "User ID not found in token. Please login again.")
//       }
//       req.userId = null
//       return next()
//     }

//     // Attach userId to request for use in controllers
//     req.userId = userId

//     next()
//   } catch (error) {
//     if (error.status) {
//       throw error
//     }
//     throw createHttpError(500, "Error extracting user information")
//   }
// }

// module.exports = {
//   verifyToken,
//   verifySuperAdmin,
//   verifyAdminOrCompany,
//   verifyCompanyToken,
//   extractCompanyId,
//   extractUserId,
// }


const jwt = require("jsonwebtoken")
const createHttpError = require("http-errors")

const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1]

  if (!token) {
    throw createHttpError(401, "No token provided")
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key")
    
    // Support BOTH token formats:
    // Admin token format: { userId, email, role: "super_admin" }
    // Company/User token format: { id, companyId, role: "company" | "user", email, ... }
    
    req.user = {
      // Normalize id: prefer decoded.id, fallback to decoded.userId (for admin tokens)
      id: decoded.id || decoded.userId,
      userId: decoded.userId, // Keep original userId for admin compatibility
      role: decoded.role,
      email: decoded.email,
      companyId: decoded.companyId || undefined, // May not exist for admins
      layer: decoded.layer || undefined,
      moduleAccess: decoded.moduleAccess || [],
    }
    
    // Attach companyId separately for backward compatibility (may be undefined for admins)
    req.companyId = decoded.companyId
    
    next()
  } catch (error) {
    throw createHttpError(401, "Invalid or expired token")
  }
}

const verifySuperAdmin = (req, res, next) => {
  verifyToken(req, res, () => {
    if (req.user.role !== "super_admin") {
      throw createHttpError(403, "Access denied. Super admin role required.")
    }
    next()
  })
}

const verifyAdminOrCompany = (req, res, next) => {
  verifyToken(req, res, () => {
    if (req.user.role !== "super_admin" && req.user.role !== "company") {
      throw createHttpError(403, "Access denied. Admin or company role required.")
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
    // IMPORTANT: super_admin role does NOT require companyId
    // Only company and user roles must have companyId
    if (req.user?.role === "super_admin") {
      // Admin doesn't have/need companyId, skip extraction
      req.companyId = null
      return next()
    }

    // For company login: companyId is the company's MongoDB ID
    // For user login: companyId is the company the user belongs to
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
    // Support all roles:
    // For super_admin: userId is from decoded.userId or decoded.id
    // For company role: userId should be null/undefined (it's a company, not a user)
    // For user role: userId is from req.user.userId or req.user.id
    const userId = req.user?.userId || req.user?.id

    if (!userId) {
      // Only throw error if user is not company role
      // Company roles don't have a userId because they ARE the company
      if (req.user?.role !== "company") {
        throw createHttpError(401, "User ID not found in token. Please login again.")
      }
      req.userId = null
      return next()
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

module.exports = {
  verifyToken,
  verifySuperAdmin,
  verifyAdminOrCompany,
  verifyCompanyToken,
  extractCompanyId,
  extractUserId,
}
