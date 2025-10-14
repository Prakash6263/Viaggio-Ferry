const { body, query, param } = require("express-validator")

const listAgentRules = [
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
  query("q").optional().isString().trim(),
  query("type").optional().isIn(["Company", "Marine", "Commercial", "Selling"]),
  query("status").optional().isIn(["Active", "Inactive"]),
]

const createAgentRules = [
  body("name").isString().trim().notEmpty(),
  body("code").isString().trim().notEmpty(),
  body("type").isIn(["Company", "Marine", "Commercial", "Selling"]),
  body("parentId").optional().isMongoId(),
  body("status").optional().isIn(["Active", "Inactive"]),
  body("notes").optional().isString(),
]

const updateAgentRules = [
  param("id").isMongoId(),
  body("name").optional().isString().trim().notEmpty(),
  body("code").optional().isString().trim().notEmpty(),
  body("type").optional().isIn(["Company", "Marine", "Commercial", "Selling"]),
  body("parentId").optional().isMongoId(),
  body("status").optional().isIn(["Active", "Inactive"]),
  body("notes").optional().isString(),
]

module.exports = { listAgentRules, createAgentRules, updateAgentRules }
