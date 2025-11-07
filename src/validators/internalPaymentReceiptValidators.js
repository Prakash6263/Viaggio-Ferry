const { body, param, query } = require("express-validator")
const { validate } = require("../middleware/validationMiddleware")

const createInternalPaymentValidation = [
  body("transactionDate").isISO8601().withMessage("Transaction date must be a valid ISO date"),
  body("transactionType").isIn(["Incoming", "Outgoing"]).withMessage("Transaction type must be Incoming or Outgoing"),
  body("payorType").isIn(["Partner", "Agent", "Company", "External"]).withMessage("Invalid payor type"),
  body("payorId").trim().notEmpty().withMessage("Payor ID is required"),
  body("payorLedgerId").isMongoId().withMessage("Invalid payor ledger ID"),
  body("payeeType").isIn(["Partner", "Agent", "Company", "Internal"]).withMessage("Invalid payee type"),
  body("payeeId").trim().notEmpty().withMessage("Payee ID is required"),
  body("payeeLedgerId").isMongoId().withMessage("Invalid payee ledger ID"),
  body("amount").isFloat({ gt: 0 }).withMessage("Amount must be greater than 0"),
  body("currency").isMongoId().withMessage("Invalid currency ID"),
  body("roe").optional().isFloat({ gt: 0 }).withMessage("Rate of exchange must be greater than 0"),
  body("amountInBaseCurrency")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Amount in base currency must be non-negative"),
  body("notes").optional().trim(),
  body("documentPath").optional().trim(),
  validate,
]

const updateInternalPaymentValidation = [
  param("id").isMongoId().withMessage("Invalid internal payment receipt ID"),
  body("transactionDate").optional().isISO8601().withMessage("Transaction date must be a valid ISO date"),
  body("transactionType")
    .optional()
    .isIn(["Incoming", "Outgoing"])
    .withMessage("Transaction type must be Incoming or Outgoing"),
  body("amount").optional().isFloat({ gt: 0 }).withMessage("Amount must be greater than 0"),
  body("currency").optional().isMongoId().withMessage("Invalid currency ID"),
  body("roe").optional().isFloat({ gt: 0 }).withMessage("Rate of exchange must be greater than 0"),
  body("notes").optional().trim(),
  validate,
]

const idParamValidation = [param("id").isMongoId().withMessage("Invalid internal payment receipt ID"), validate]

const listInternalPaymentsValidation = [
  query("page").optional().isInt({ min: 1 }).withMessage("Page must be a positive integer"),
  query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("Limit must be between 1 and 100"),
  query("status").optional().isIn(["Draft", "Confirmed", "Reconciled", "Cancelled"]).withMessage("Invalid status"),
  query("transactionType").optional().isIn(["Incoming", "Outgoing"]).withMessage("Invalid transaction type"),
  query("startDate").optional().isISO8601().withMessage("Start date must be a valid ISO date"),
  query("endDate").optional().isISO8601().withMessage("End date must be a valid ISO date"),
  validate,
]

const confirmPaymentValidation = [param("id").isMongoId().withMessage("Invalid internal payment receipt ID"), validate]

module.exports = {
  createInternalPaymentValidation,
  updateInternalPaymentValidation,
  idParamValidation,
  listInternalPaymentsValidation,
  confirmPaymentValidation,
}
