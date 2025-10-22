const { body, query, param } = require("express-validator")

const listB2CCustomerRules = [
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
  query("q").optional().isString().trim(),
  query("partner").optional().isMongoId(),
  query("status").optional().isIn(["Active", "Inactive"]),
]

const createB2CCustomerRules = [
  body("name").isString().trim().notEmpty().withMessage("Name is required"),
  body("partnerId").isMongoId().withMessage("Valid partner ID is required"),
  body("nationality").isString().trim().notEmpty().withMessage("Nationality is required"),
  body("password").isString().trim().notEmpty().withMessage("Password is required"),
  body("whatsappNumber").isString().trim().notEmpty().withMessage("WhatsApp number is required"),
  body("status").optional().isIn(["Active", "Inactive"]),

  body("address.street").optional().isString().trim(),
  body("address.city").optional().isString().trim(),
  body("address.country").optional().isString().trim(),

  body("notes").optional().isString(),
]

const updateB2CCustomerRules = [
  param("id").isMongoId(),
  body("name").optional().isString().trim().notEmpty(),
  body("partnerId").optional().isMongoId(),
  body("nationality").optional().isString().trim().notEmpty(),
  body("password").optional().isString().trim().notEmpty(),
  body("whatsappNumber").optional().isString().trim().notEmpty(),
  body("status").optional().isIn(["Active", "Inactive"]),

  body("address.street").optional().isString().trim(),
  body("address.city").optional().isString().trim(),
  body("address.country").optional().isString().trim(),

  body("notes").optional().isString(),
]

module.exports = { listB2CCustomerRules, createB2CCustomerRules, updateB2CCustomerRules }
