const { body, param, query } = require("express-validator")
const { LAYER_CODES, MODULE_CODES } = require("../constants/rbac")

const objectId = (value) => /^[a-fA-F0-9]{24}$/.test(String(value))

const permissionRule = (prefix) => [
  body(`${prefix}.submoduleCode`).isString().trim().notEmpty(),
  body(`${prefix}.canRead`).optional().isBoolean().toBoolean(),
  body(`${prefix}.canWrite`).optional().isBoolean().toBoolean(),
  body(`${prefix}.canEdit`).optional().isBoolean().toBoolean(),
  body(`${prefix}.canDelete`).optional().isBoolean().toBoolean(),
]

const createAccessGroupRules = [
  body("company").exists().withMessage("company is required").bail().custom(objectId).withMessage("invalid company id"),
  body("groupName").isString().trim().notEmpty(),
  body("groupCode").isString().trim().notEmpty(),
  body("moduleCode").isString().trim().toLowerCase().isIn(MODULE_CODES),
  body("layer").isString().isIn(LAYER_CODES),
  body("isActive").optional().isBoolean().toBoolean(),
  body("permissions").optional().isArray(),
  ...permissionRule("permissions.*"),
]

const updateAccessGroupRules = [
  body("company").optional().custom(objectId).withMessage("invalid company id"),
  body("groupName").optional().isString().trim().notEmpty(),
  body("groupCode").optional().isString().trim().notEmpty(),
  body("moduleCode").optional().isString().trim().toLowerCase().isIn(MODULE_CODES),
  body("layer").optional().isString().isIn(LAYER_CODES),
  body("isActive").optional().isBoolean().toBoolean(),
  body("permissions").optional().isArray(),
  ...permissionRule("permissions.*"),
]

const listAccessGroupRules = [
  query("companyId")
    .exists()
    .withMessage("companyId is required")
    .bail()
    .custom(objectId)
    .withMessage("invalid companyId"),
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("limit").optional().isInt({ min: 1, max: 200 }).toInt(),
  query("q").optional().isString(),
  query("moduleCode").optional().isString(),
  query("layer").optional().isString().isIn(LAYER_CODES),
  query("status").optional().isIn(["active", "inactive"]),
]

module.exports = { createAccessGroupRules, updateAccessGroupRules, listAccessGroupRules }
