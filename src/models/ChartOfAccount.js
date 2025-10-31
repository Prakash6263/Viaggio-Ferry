const mongoose = require("mongoose")

const STATUS = ["Active", "Inactive"]
const LEDGER_TYPES = [
  "Assets",
  "Liabilities",
  "Equity",
  "Revenue",
  "Expenses",
  "Cash & Banks",
  "Accounts Receivable",
  "Accounts Payable",
  "Inventory",
]

const ChartOfAccountSchema = new mongoose.Schema(
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
      minlength: 2,
      maxlength: 20,
    },
    ledgerDescription: {
      type: String,
      required: true,
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
    systemAccount: {
      type: Boolean,
      default: false,
    },
    partnerAccount: {
      type: String,
      default: "N/A",
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
      default: "",
      maxlength: 2000,
    },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
)

ChartOfAccountSchema.index({ company: 1, ledgerCode: 1 }, { unique: true })
ChartOfAccountSchema.index({ company: 1, ledgerDescription: "text", ledgerCode: "text", ledgerType: "text" })
ChartOfAccountSchema.index({ company: 1, status: 1 })
ChartOfAccountSchema.index({ company: 1, ledgerType: 1 })

module.exports = {
  ChartOfAccount: mongoose.model("ChartOfAccount", ChartOfAccountSchema),
  CHART_OF_ACCOUNT_STATUS: STATUS,
  CHART_OF_ACCOUNT_LEDGER_TYPES: LEDGER_TYPES,
}
