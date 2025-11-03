const { body, param, query } = require("express-validator")
const { validate } = require("../middleware/validationMiddleware")
const { SERVICE_TYPES } = require("../models/JournalEntry")

const createJournalEntryValidation = [
  body("journalNo").trim().notEmpty().withMessage("Journal number is required"),
  body("journalDate").isISO8601().withMessage("Journal date must be a valid date").toDate(),
  body("layer").isIn(["Primary", "Adjustment", "Reversing"]).withMessage("Invalid layer"),
  body("partner").optional().isMongoId().withMessage("Invalid partner ID"),
  body("docReference").optional().trim(),
  body("voyageNo").optional().trim(),
  body("serviceType").isIn(SERVICE_TYPES).withMessage("Invalid service type"),
  body("journalLines").isArray({ min: 1 }).withMessage("At least one journal line is required"),
  body("journalLines.*.ledgerCode").isMongoId().withMessage("Invalid ledger code ID"),
  body("journalLines.*.debit").optional().isFloat({ min: 0 }).withMessage("Debit must be a positive number"),
  body("journalLines.*.credit").optional().isFloat({ min: 0 }).withMessage("Credit must be a positive number"),
  body("journalLines.*.currency").isMongoId().withMessage("Invalid currency ID"),
  body("journalLines.*.rate").optional().isFloat({ min: 0 }).withMessage("Rate must be a positive number"),
  body("notes").optional().trim(),
  validate,
]

const updateJournalEntryValidation = [
  param("id").isMongoId().withMessage("Invalid journal entry ID"),
  body("journalDate").optional().isISO8601().withMessage("Journal date must be a valid date"),
  body("layer").optional().isIn(["Primary", "Adjustment", "Reversing"]).withMessage("Invalid layer"),
  body("partner").optional().isMongoId().withMessage("Invalid partner ID"),
  body("serviceType").optional().isIn(SERVICE_TYPES).withMessage("Invalid service type"),
  body("journalLines").optional().isArray({ min: 1 }).withMessage("At least one journal line is required"),
  validate,
]

const idParamValidation = [param("id").isMongoId().withMessage("Invalid journal entry ID"), validate]

const listJournalEntriesValidation = [
  query("page").optional().isInt({ min: 1 }).withMessage("Page must be a positive integer"),
  query("limit").optional().isInt({ min: 1 }).withMessage("Limit must be a positive integer"),
  query("status").optional().isIn(["Draft", "Posted", "Cancelled"]).withMessage("Invalid status"),
  query("layer").optional().isIn(["Primary", "Adjustment", "Reversing"]).withMessage("Invalid layer"),
  validate,
]

module.exports = {
  createJournalEntryValidation,
  updateJournalEntryValidation,
  idParamValidation,
  listJournalEntriesValidation,
}
