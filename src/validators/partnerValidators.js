const { body, query, param } = require("express-validator")

const listPartnerRules = [
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
  query("q").optional().isString().trim(),
  query("layer").optional().isIn(["Marine", "Commercial", "Selling"]),
  query("status").optional().isIn(["Active", "Inactive"]),
]

const createPartnerRules = [
  body("name").isString().trim().notEmpty().withMessage("Name is required"),
  body("phone").isString().trim().notEmpty().withMessage("Phone is required"),
  body("address").isString().trim().notEmpty().withMessage("Address is required"),
  body("layer").isIn(["Marine", "Commercial", "Selling"]).withMessage("Invalid layer"),
  body("parentAccountId").optional().isMongoId().withMessage("Invalid parent account ID"),
  body("partnerStatus").optional().isIn(["Active", "Inactive"]),
  body("priceList").optional().isString(),

  body("creditLimit.limitAmount").optional().isFloat({ min: 0 }).withMessage("Limit amount must be a positive number"),
  body("creditLimit.limitTicket").optional().isString(),

  body("contactInformation.name").optional().isString().trim(),
  body("contactInformation.title").optional().isString().trim(),
  body("contactInformation.phone").optional().isString().trim(),
  body("contactInformation.email").optional().isEmail().withMessage("Invalid email format"),
  body("contactInformation.hotline").optional().isString().trim(),

  body("users").optional().isArray(),
  body("users.*").optional().isMongoId(),
  body("notes").optional().isString(),
]

const updatePartnerRules = [
  param("id").isMongoId(),
  body("name").optional().isString().trim().notEmpty(),
  body("phone").optional().isString().trim().notEmpty(),
  body("address").optional().isString().trim().notEmpty(),
  body("layer").optional().isIn(["Marine", "Commercial", "Selling"]),
  body("parentAccountId").optional().isMongoId(),
  body("partnerStatus").optional().isIn(["Active", "Inactive"]),
  body("priceList").optional().isString(),

  body("creditLimit.limitAmount").optional().isFloat({ min: 0 }).withMessage("Limit amount must be a positive number"),
  body("creditLimit.limitTicket").optional().isString(),

  body("contactInformation.name").optional().isString().trim(),
  body("contactInformation.title").optional().isString().trim(),
  body("contactInformation.phone").optional().isString().trim(),
  body("contactInformation.email").optional().isEmail().withMessage("Invalid email format"),
  body("contactInformation.hotline").optional().isString().trim(),

  body("users").optional().isArray(),
  body("users.*").optional().isMongoId(),
  body("notes").optional().isString(),
]

module.exports = { listPartnerRules, createPartnerRules, updatePartnerRules }
