const { body, param, query } = require("express-validator")
const { validate } = require("../middleware/validationMiddleware")
const { TOPUP_STATUS, CONFIRMATION_STATUS } = require("../models/AgentTopup")

const createAgentTopupValidation = [
  body("transactionNo").trim().notEmpty().withMessage("Transaction number is required"),
  body("transactionDate").isISO8601().withMessage("Transaction date must be a valid date").toDate(),
  body("payorDetails.partner").isMongoId().withMessage("Invalid payor partner ID"),
  body("payorDetails.ledger").isMongoId().withMessage("Invalid payor ledger ID"),
  body("payeeDetails.partner").isMongoId().withMessage("Invalid payee partner ID"),
  body("payeeDetails.ledger").isMongoId().withMessage("Invalid payee ledger ID"),
  body("amountCurrency").isMongoId().withMessage("Invalid currency ID"),
  body("amount").isFloat({ min: 0 }).withMessage("Amount must be a positive number"),
  body("rateOfExchange").isFloat({ min: 0 }).withMessage("Rate of exchange must be a positive number"),
  body("notes").optional().trim(),
  body("documentUpload").optional().isObject().withMessage("Document upload must be an object"),
  validate,
]

const updateAgentTopupValidation = [
  param("id").isMongoId().withMessage("Invalid topup ID"),
  body("transactionDate").optional().isISO8601().withMessage("Transaction date must be a valid date"),
  body("payorDetails.partner").optional().isMongoId().withMessage("Invalid payor partner ID"),
  body("payorDetails.ledger").optional().isMongoId().withMessage("Invalid payor ledger ID"),
  body("payeeDetails.partner").optional().isMongoId().withMessage("Invalid payee partner ID"),
  body("payeeDetails.ledger").optional().isMongoId().withMessage("Invalid payee ledger ID"),
  body("amountCurrency").optional().isMongoId().withMessage("Invalid currency ID"),
  body("amount").optional().isFloat({ min: 0 }).withMessage("Amount must be a positive number"),
  body("rateOfExchange").optional().isFloat({ min: 0 }).withMessage("Rate of exchange must be a positive number"),
  body("notes").optional().trim(),
  validate,
]

const idParamValidation = [param("id").isMongoId().withMessage("Invalid topup ID"), validate]

const listAgentTopupsValidation = [
  query("page").optional().isInt({ min: 1 }).withMessage("Page must be a positive integer"),
  query("limit").optional().isInt({ min: 1 }).withMessage("Limit must be a positive integer"),
  query("status").optional().isIn(TOPUP_STATUS).withMessage("Invalid status"),
  validate,
]

const updateConfirmationValidation = [
  param("id").isMongoId().withMessage("Invalid topup ID"),
  body("status").isIn(CONFIRMATION_STATUS).withMessage("Invalid confirmation status"),
  validate,
]

const rejectAgentTopupValidation = [
  param("id").isMongoId().withMessage("Invalid topup ID"),
  body("reason").optional().trim(),
  validate,
]

module.exports = {
  createAgentTopupValidation,
  updateAgentTopupValidation,
  idParamValidation,
  listAgentTopupsValidation,
  updateConfirmationValidation,
  rejectAgentTopupValidation,
}
