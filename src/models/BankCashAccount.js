const mongoose = require("mongoose")

const ACCOUNT_TYPES = ["Cash", "Bank", "Credit Card", "Mobile Wallet"]
const STATUS = ["Active", "Inactive"]

const BankCashAccountSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    layer: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    partnerAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Partner",
      default: null,
    },
    accountType: {
      type: String,
      enum: ACCOUNT_TYPES,
      required: true,
    },
    accountName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    bankAccountNo: {
      type: String,
      default: "N/A",
      trim: true,
    },
    currency: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Currency",
      required: true,
    },
    ledgerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CompanyLedger",
      required: false,
    },
    ledgerCode: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      minlength: 2,
      maxlength: 20,
    },
    chartOfAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChartOfAccount",
      required: false,
    },
    status: {
      type: String,
      enum: STATUS,
      default: "Active",
    },
    note: {
      type: String,
      trim: true,
      default: "",
      maxlength: 2000,
    },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true },
)

BankCashAccountSchema.index({ company: 1, accountName: 1 }, { unique: true })
BankCashAccountSchema.index({ company: 1, ledgerCode: 1 })
BankCashAccountSchema.index({
  company: 1,
  accountName: "text",
  bankAccountNo: "text",
  accountType: "text",
})
BankCashAccountSchema.index({ company: 1, status: 1 })
BankCashAccountSchema.index({ company: 1, accountType: 1 })

module.exports = {
  BankCashAccount: mongoose.model("BankCashAccount", BankCashAccountSchema),
  BANK_CASH_ACCOUNT_TYPES: ACCOUNT_TYPES,
  BANK_CASH_ACCOUNT_STATUS: STATUS,
}
