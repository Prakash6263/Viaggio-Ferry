const { body } = require("express-validator")
const { MODULE_CODES } = require("../constants/rbac")

const submoduleRules = (prefix) => [
  body(`${prefix}.code`).isString().trim().notEmpty(),
  body(`${prefix}.name`).isString().trim().notEmpty(),
  body(`${prefix}.description`).optional().isString(),
]

const createModuleRules = [
  body("code").isString().trim().toLowerCase().isIn(MODULE_CODES),
  body("name").isString().trim().notEmpty(),
  body("isActive").optional().isBoolean().toBoolean(),
  body("submodules").optional().isArray(),
  ...submoduleRules("submodules.*"),
]

module.exports = { createModuleRules }
