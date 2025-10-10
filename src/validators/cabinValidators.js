const { body, param, query, validationResult } = require("express-validator")
const { CABIN_TYPES, CABIN_STATUS } = require("../models/Cabin")

const validate = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })
  next()
}

const createCabinValidation = [
  body("name").isString().trim().notEmpty().withMessage("name is required"),
  body("type")
    .isIn(CABIN_TYPES)
    .withMessage(`type must be one of: ${CABIN_TYPES.join(", ")}`),
  body("description").optional().isString().isLength({ max: 4000 }),
  body("remarks").optional().isString().isLength({ max: 2000 }),
  body("status").optional().isIn(CABIN_STATUS),
  validate,
]

const updateCabinValidation = [
  param("id").isMongoId().withMessage("invalid cabin id"),
  body("name").optional().isString().trim().notEmpty(),
  body("type").optional().isIn(CABIN_TYPES),
  body("description").optional().isString().isLength({ max: 4000 }),
  body("remarks").optional().isString().isLength({ max: 2000 }),
  body("status").optional().isIn(CABIN_STATUS),
  validate,
]

const idParamValidation = [param("id").isMongoId().withMessage("invalid cabin id"), validate]

const listCabinsValidation = [
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
  query("q").optional().isString().trim(),
  query("type").optional().isIn(CABIN_TYPES),
  query("status").optional().isIn(CABIN_STATUS),
  query("sortBy").optional().isIn(["name", "type", "status", "createdAt", "updatedAt"]),
  query("sortOrder").optional().isIn(["asc", "desc"]),
  validate,
]

module.exports = {
  createCabinValidation,
  updateCabinValidation,
  idParamValidation,
  listCabinsValidation,
}
