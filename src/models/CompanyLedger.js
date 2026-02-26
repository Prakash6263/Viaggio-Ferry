const mongoose = require("mongoose")
const { LEDGER_TYPES, LEDGER_TYPE_MAPPING } = require("../constants/ledgerTypes")

const STATUS = ["Active", "Inactive"]

/**
 * CompanyLedger Schema
 *
 * Purpose: Operational Chart of Accounts for each company tenant
 * - MUST have companyId (multi-tenant isolation)
 * - Inherits from SuperAdminLedger via baseLedger reference
 * - Can also have system-generated ledgers (Partner, Salesman, Bank)
 * - Companies can create limited expense-type ledgers if allowed
 * - All deletes are soft delete only
 *
 * Types of CompanyLedger records:
 * 1. Inherited Base Ledgers (baseLedger != null, systemAccount = true, locked = true)
 * 2. System-Generated Ledgers (baseLedger = null, systemAccount = true, locked = true, createdBy = "system")
 * 3. Company-Created Ledgers (baseLedger = null, systemAccount = false, createdBy = "company")
 */
const CompanyLedgerSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    ledgerCode: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      match: /^\d{2}-\d{5}$/,
    },
    ledgerSequenceNumber: {
      type: Number,
      default: 0,
    },
    ledgerDescription: {
      type: String,
      required: false,
      trim: true,
      maxlength: 500,
    },
    ledgerType: {
      type: String,
      enum: LEDGER_TYPES,
      required: true,
      index: true,
    },
    typeSequence: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: STATUS,
      default: "Active",
      index: true,
    },
    // True for base ledgers and system-generated ledgers (Partner, Salesman, Bank)
    systemAccount: {
      type: Boolean,
      default: false,
    },
    // True for base ledgers and system-generated ledgers (prevents company modification)
    locked: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: String,
      enum: ["super_admin", "company", "system"],
      default: "company",
    },
    // For Partner and Salesman ledgers - stores reference ID
    partnerAccount: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "partnerModel",
      default: null,
    },
    partnerModel: {
      type: String,
      enum: ["Partner", "User", "N/A"],
      default: "N/A",
    },
    notes: {
      type: String,
      trim: true,
      default: "",
      maxlength: 2000,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: "companyledgers",
  },
)

// Compound indexes for multi-tenant queries
CompanyLedgerSchema.index({ company: 1, ledgerCode: 1 }, { unique: true })
CompanyLedgerSchema.index({ company: 1, ledgerType: 1 })
CompanyLedgerSchema.index({ company: 1, status: 1 })
CompanyLedgerSchema.index({ company: 1, systemAccount: 1 })
CompanyLedgerSchema.index({
  company: 1,
  ledgerDescription: "text",
  ledgerCode: "text",
})

module.exports = {
  CompanyLedger: mongoose.model("CompanyLedger", CompanyLedgerSchema),
  COMPANY_LEDGER_STATUS: STATUS,
}
