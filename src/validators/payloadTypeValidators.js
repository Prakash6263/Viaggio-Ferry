const { body, param, query, validationResult } = require("express-validator")
const { PAYLOAD_CATEGORIES, PAYLOAD_STATUS } = require("../models/PayloadType")

const validate = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })
  next()
}

const createPayloadTypeValidation = [
  body("name").isString().trim().notEmpty().withMessage("name is required"),
  body("code")
    .isString()
    .trim()
    .notEmpty()
    .isLength({ min: 2, max: 5 })
    .customSanitizer((v) => v.toUpperCase()),
  body("description").optional().isString().isLength({ max: 4000 }),
  body("category")
    .isIn(PAYLOAD_CATEGORIES)
    .withMessage(`category must be one of: ${PAYLOAD_CATEGORIES.join(", ")}`),
  body("maxWeightKg").optional().isFloat({ min: 0 }).toFloat(),
  body("dimensions").optional().isString().isLength({ max: 255 }),
  body("status").optional().isIn(PAYLOAD_STATUS),
  validate,
]

const updatePayloadTypeValidation = [
  param("id").isMongoId().withMessage("invalid id"),
  body("name").optional().isString().trim().notEmpty(),
  body("code")
    .optional()
    .isString()
    .trim()
    .isLength({ min: 2, max: 5 })
    .customSanitizer((v) => v.toUpperCase()),
  body("description").optional().isString().isLength({ max: 4000 }),
  body("category").optional().isIn(PAYLOAD_CATEGORIES),
  body("maxWeightKg").optional().isFloat({ min: 0 }).toFloat(),
  body("dimensions").optional().isString().isLength({ max: 255 }),
  body("status").optional().isIn(PAYLOAD_STATUS),
  validate,
]

const idParamValidation = [param("id").isMongoId().withMessage("invalid id"), validate]

const listPayloadTypesValidation = [
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
  query("q").optional().isString().trim(),
  query("category").optional().isIn(PAYLOAD_CATEGORIES),
  query("status").optional().isIn(PAYLOAD_STATUS),
  query("sortBy").optional().isIn(["name", "code", "category", "status", "maxWeightKg", "createdAt", "updatedAt"]),
  query("sortOrder").optional().isIn(["asc", "desc"]),
  validate,
]

module.exports = {
  createPayloadTypeValidation,
  updatePayloadTypeValidation,
  idParamValidation,
  listPayloadTypesValidation,
}
