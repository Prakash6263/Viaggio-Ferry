const mongoose = require("mongoose")

const GeneralLedgerSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    // Transaction identifier
    journalEntry: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JournalEntry",
      required: true,
      index: true,
    },
    journalNo: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    journalDate: {
      type: Date,
      required: true,
      index: true,
    },
    // Ledger account details
    ledgerCode: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChartOfAccount",
      required: true,
      index: true,
    },
    ledgerCodeText: {
      type: String,
      required: true,
      index: true,
    },
    ledgerDescription: {
      type: String,
      required: true,
      index: true,
    },
    // Debit/Credit amounts
    debit: {
      type: Number,
      default: 0,
      min: 0,
    },
    credit: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Currency and conversion
    currency: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Currency",
      required: true,
    },
    currencyCode: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    amountInCurrency: {
      type: Number,
      required: true,
    },
    rate: {
      type: Number,
      default: 1,
      min: 0,
    },
    // Running balance calculation
    balance: {
      type: Number,
      default: 0,
    },
    // Transaction context
    layer: {
      type: String,
      enum: ["Primary", "Adjustment", "Reversing"],
      default: "Primary",
      index: true,
    },
    partner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Partner",
      default: null,
    },
    partnerName: {
      type: String,
      default: "",
      trim: true,
    },
    docReference: {
      type: String,
      trim: true,
      default: "",
    },
    voyageNo: {
      type: String,
      trim: true,
      default: "",
    },
    serviceType: {
      type: String,
      enum: ["Freight", "Port Charges", "Agency Fees", "Adjustment", "Other"],
      default: "Other",
    },
    note: {
      type: String,
      trim: true,
      default: "",
    },
    // Posting status
    posted: {
      type: Boolean,
      default: false,
      index: true,
    },
    postedDate: {
      type: Date,
      default: null,
    },
    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    // Audit
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true },
)

// Indexes for efficient querying
GeneralLedgerSchema.index({ company: 1, ledgerCode: 1, journalDate: 1 })
GeneralLedgerSchema.index({ company: 1, journalDate: 1, ledgerCode: 1 })
GeneralLedgerSchema.index({ company: 1, ledgerCodeText: 1, journalDate: 1 })
GeneralLedgerSchema.index({
  company: 1,
  ledgerDescription: "text",
  ledgerCodeText: "text",
  partnerName: "text",
})
GeneralLedgerSchema.index({ company: 1, posted: 1, journalDate: 1 })
GeneralLedgerSchema.index({ company: 1, layer: 1, journalDate: 1 })

module.exports = {
  GeneralLedger: mongoose.model("GeneralLedger", GeneralLedgerSchema),
}
