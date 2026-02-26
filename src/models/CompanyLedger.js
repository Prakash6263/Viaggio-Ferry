const mongoose = require("mongoose")
const { LEDGER_TYPES, LEDGER_TYPE_MAPPING } = require("../constants/ledgerTypes")

const STATUS = ["Active", "Inactive"]

const CompanyLedgerSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    baseLedger: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SuperAdminLedger",
      default: null,
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
    },
    systemAccount: {
      type: Boolean,
      default: false,
    },
    locked: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: String,
      enum: ["super_admin", "company", "system"],
      default: "company",
    },
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
    },
  },
  {
    timestamps: true,
    collection: "companyledgers",
  },
)

// Compound indexes for multi-tenant queries (no duplicates with inline indexes)
CompanyLedgerSchema.index({ company: 1, ledgerCode: 1 }, { unique: true })
CompanyLedgerSchema.index({ company: 1, ledgerType: 1 })
CompanyLedgerSchema.index({ company: 1, status: 1 })
CompanyLedgerSchema.index({ company: 1, systemAccount: 1 })
CompanyLedgerSchema.index({ company: 1, baseLedger: 1 })
CompanyLedgerSchema.index({ company: 1, isDeleted: 1 })
CompanyLedgerSchema.index({
  company: 1,
  ledgerDescription: "text",
  ledgerCode: "text",
})

module.exports = {
  CompanyLedger: mongoose.model("CompanyLedger", CompanyLedgerSchema),
  COMPANY_LEDGER_STATUS: STATUS,
}
