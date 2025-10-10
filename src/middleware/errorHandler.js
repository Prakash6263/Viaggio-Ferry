function notFound(req, res, next) {
  const err = new Error(`Not Found - ${req.originalUrl}`)
  err.status = 404
  next(err)
}

function errorHandler(err, req, res, next) {
  const status = err.status || 500
  const payload = {
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
