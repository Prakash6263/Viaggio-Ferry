const extractCompanyId = (req, res, next) => {
  try {
    // Extract companyId from JWT token (set by authMiddleware)
    const companyId = req.user?.companyId || req.company?.id

    if (!companyId) {
      return res.status(401).json({
        success: false,
        message: "Company ID not found in token. Please login again.",
      })
    }

    // Attach companyId to request for use in controllers
    req.companyId = companyId

    next()
  } catch (error) {
    console.error("[v0] Error in extractCompanyId middleware:", error.message)
    res.status(500).json({
      success: false,
      message: "Error extracting company information",
    })
  }
}

module.exports = {
  extractCompanyId,
}
