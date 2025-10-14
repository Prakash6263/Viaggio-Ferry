const { body, param, query, validationResult } = require("express-validator")

const createContactMessageValidators = [
  body("fullName").trim().notEmpty().withMessage("Full name is required"),
  body("email").isEmail().withMessage("Valid email is required").normalizeEmail(),
  body("subject").optional().isLength({ max: 200 }).withMessage("Subject max length is 200").trim(),
  body("message")
    .trim()
    .notEmpty()
    .withMessage("Message is required")
    .isLength({ max: 5000 })
    .withMessage("Message max length is 5000"),
]

const updateContactMessageValidators = [
  param("id").isMongoId().withMessage("Invalid message id"),
  body("status")
    .optional()
    .isIn(["New", "InProgress", "Closed"])
    .withMessage("Status must be one of New, InProgress, Closed"),
  body("internalNotes").optional().isLength({ max: 5000 }).withMessage("Internal notes max length is 5000"),
]

const listContactMessageValidators = [
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
  query("q").optional().isString().trim(),
  query("status").optional().isIn(["New", "InProgress", "Closed"]),
  query("sortBy").optional().isIn(["createdAt", "fullName", "email", "status"]),
  query("sortOrder").optional().isIn(["asc", "desc"]),
]

// helper to handle validation within controllers/routes if needed
function validateRequest(req) {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    const err = new Error("Validation failed")
    err.status = 400
    err.details = errors.array()
    throw err
  }
}

module.exports = {
  createContactMessageValidators,
  updateContactMessageValidators,
  listContactMessageValidators,
  validateRequest,
}
