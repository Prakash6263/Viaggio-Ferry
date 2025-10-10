const { body, param, query, validationResult } = require("express-validator")
const { PORT_STATUS } = require("../models/Port")

const validate = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() })
  }
  next()
}

const createPortValidation = [
  body("name").isString().trim().notEmpty().withMessage("name is required"),
  body("code")
    .isString()
    .trim()
    .toUpperCase()
    .matches(/^[A-Z0-9]{2,5}$/)
    .withMessage("code must be 2-5 uppercase alphanumerics"),
  body("country").isString().trim().notEmpty().withMessage("country is required"),
  body("timezone")
    .isString()
    .trim()
    .matches(/^UTC[+-]\d{2}:\d{2}$/)
    .withMessage("timezone must be like UTC+02:00"),
  body("status")
    .optional()
    .isIn(PORT_STATUS)
    .withMessage(`status must be one of: ${PORT_STATUS.join(", ")}`),
  body("notes").optional().isString().isLength({ max: 2000 }),
  validate,
]

const updatePortValidation = [
  param("id").isMongoId().withMessage("invalid port id"),
  body("name").optional().isString().trim().notEmpty(),
  body("code")
    .optional()
    .isString()
    .trim()
    .toUpperCase()
    .matches(/^[A-Z0-9]{2,5}$/),
  body("country").optional().isString().trim().notEmpty(),
  body("timezone")
    .optional()
    .isString()
    .trim()
    .matches(/^UTC[+-]\d{2}:\d{2}$/),
  body("status").optional().isIn(PORT_STATUS),
  body("notes").optional().isString().isLength({ max: 2000 }),
  validate,
]

const idParamValidation = [param("id").isMongoId().withMessage("invalid port id"), validate]

const listPortsValidation = [
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
  query("q").optional().isString().trim(),
  query("status").optional().isIn(PORT_STATUS),
  query("sortBy").optional().isIn(["name", "code", "country", "timezone", "status", "createdAt", "updatedAt"]),
  query("sortOrder").optional().isIn(["asc", "desc"]),
  validate,
]

module.exports = {
  createPortValidation,
  updatePortValidation,
  idParamValidation,
  listPortsValidation,
}
