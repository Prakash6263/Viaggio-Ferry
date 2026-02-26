const tripTicketRuleValidationMiddleware = {
  /**
   * Validate create ticket rule payload
   */
  validateCreatePayload: (req, res, next) => {
    const { ruleType, ticketingRule } = req.body

    // Validate ruleType
    if (!ruleType) {
      return res.status(400).json({
        success: false,
        message: "Missing required field: ruleType",
      })
    }

    const validRuleTypes = ["VOID", "REFUND", "REISSUE"]
    if (!validRuleTypes.includes(ruleType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid ruleType. Must be one of: ${validRuleTypes.join(", ")}`,
      })
    }

    // Validate ticketingRule
    if (!ticketingRule) {
      return res.status(400).json({
        success: false,
        message: "Missing required field: ticketingRule",
      })
    }

    // Validate ticketingRule format
    if (typeof ticketingRule !== "string" || ticketingRule.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid ticketingRule format",
      })
    }

    next()
  },

  /**
   * Validate update ticket rule payload
   */
  validateUpdatePayload: (req, res, next) => {
    const { ruleType, ticketingRule, isActive } = req.body

    // At least one field must be provided
    if (!ruleType && !ticketingRule && isActive === undefined) {
      return res.status(400).json({
        success: false,
        message: "At least one field must be provided for update",
      })
    }

    // Validate ruleType if provided
    if (ruleType) {
      const validRuleTypes = ["VOID", "REFUND", "REISSUE"]
      if (!validRuleTypes.includes(ruleType)) {
        return res.status(400).json({
          success: false,
          message: `Invalid ruleType. Must be one of: ${validRuleTypes.join(", ")}`,
        })
      }
    }

    // Validate ticketingRule if provided
    if (ticketingRule) {
      if (typeof ticketingRule !== "string" || ticketingRule.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid ticketingRule format",
        })
      }
    }

    // Validate isActive if provided
    if (isActive !== undefined && typeof isActive !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "isActive must be a boolean",
      })
    }

    next()
  },

  /**
   * Validate path parameters
   */
  validatePathParams: (req, res, next) => {
    const { tripId, id } = req.params

    if (!tripId) {
      return res.status(400).json({
        success: false,
        message: "Missing tripId parameter",
      })
    }

    if (!id && req.method !== "GET") {
      return res.status(400).json({
        success: false,
        message: "Missing rule ID parameter",
      })
    }

    next()
  },
}

module.exports = tripTicketRuleValidationMiddleware
