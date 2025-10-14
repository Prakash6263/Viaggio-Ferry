const { body, query, param } = require("express-validator")

const listUserRules = [
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
  query("q").optional().isString().trim(),
  query("status").optional().isIn(["Active", "Inactive"]),
  query("isSalesman").optional().isBoolean().toBoolean(),
  query("agentId").optional().isMongoId(),
]

const createUserRules = [
  body("fullName").isString().trim().notEmpty().withMessage("Full name is required"),
  body("email").isEmail().withMessage("Valid email required").normalizeEmail(),
  body("position").optional().isString().trim(),
  body("agentId").optional().isMongoId(),
  body("isSalesman").optional().isBoolean().toBoolean(),
  body("remarks").optional().isString(),
  body("status").optional().isIn(["Active", "Inactive"]),
  body("accessGroups").optional().isArray(),
  body("accessGroups.*").optional().isMongoId(),
]

const updateUserRules = [
  param("id").isMongoId(),
  body("fullName").optional().isString().trim().notEmpty(),
  body("email").optional().isEmail().normalizeEmail(),
  body("position").optional().isString().trim(),
  body("agentId").optional().isMongoId(),
  body("isSalesman").optional().isBoolean().toBoolean(),
  body("remarks").optional().isString(),
  body("status").optional().isIn(["Active", "Inactive"]),
  body("accessGroups").optional().isArray(),
  body("accessGroups.*").optional().isMongoId(),
]

module.exports = {
  listUserRules,
  createUserRules,
  updateUserRules,
}
