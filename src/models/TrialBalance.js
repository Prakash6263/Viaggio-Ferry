const mongoose = require("mongoose")

const TrialBalanceSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    // Account details
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
    ledgerType: {
      type: String,
      required: true,
      index: true,
    },
    // Balance information
    initialBalance: {
      type: Number,
      default: 0,
      index: false,
    },
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
    endBalance: {
      type: Number,
      default: 0,
    },
    // Balance status
    balanceStatus: {
      type: String,
      enum: ["Debit", "Credit", "Balanced"],
      default: "Balanced",
      index: true,
    },
    // Period information
    asOfDate: {
      type: Date,
      required: true,
      index: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    // Audit
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    lastRefreshed: {
      type: Date,
      default: null,
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
TrialBalanceSchema.index({ company: 1, asOfDate: 1 })
TrialBalanceSchema.index({ company: 1, ledgerCode: 1, asOfDate: 1 })
TrialBalanceSchema.index({ company: 1, ledgerType: 1, asOfDate: 1 })
TrialBalanceSchema.index({ company: 1, balanceStatus: 1 })
TrialBalanceSchema.index({
  company: 1,
  ledgerDescription: "text",
  ledgerCodeText: "text",
  ledgerType: "text",
})

module.exports = {
  TrialBalance: mongoose.model("TrialBalance", TrialBalanceSchema),
  TRIAL_BALANCE_STATUS: ["Debit", "Credit", "Balanced"],
}
