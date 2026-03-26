const { formatMongoDBError } = require("../utils/mongoErrorHandler")

function notFound(req, res, next) {
  const err = new Error(`Not Found - ${req.originalUrl}`)
  err.status = 404
  next(err)
}

/**
 * Global error handler middleware
 * Handles all errors including MongoDB E11000 duplicate key errors
 */
function errorHandler(err, req, res, next) {
  // Get entity name from route or default
  let entityName = "Record"
  
  // Map routes to entity names
  const routeEntityMap = {
    "price-lists/details": "Price Detail",
    "price-lists": "Price List",
    "partners": "Partner",
    "taxes": "Tax",
  }
  
  for (const [route, name] of Object.entries(routeEntityMap)) {
    if (req.originalUrl && req.originalUrl.includes(route)) {
      entityName = name
      break
    }
  }
  
  // Check for MongoDB duplicate key error
  const mongoError = formatMongoDBError(err, entityName)
  
  if (mongoError) {
    return res.status(mongoError.status).json({
      success: false,
      code: mongoError.code,
      message: mongoError.message,
      details: mongoError.details,
    })
  }

  // Handle other errors
  const status = err.status || 500
  const payload = {
    success: false,
    message: err.message || "Server error",
    ...(err.details ? { details: err.details } : {}),
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  }
  res.status(status).json(payload)
}

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)
}

module.exports = { notFound, errorHandler, asyncHandler }
