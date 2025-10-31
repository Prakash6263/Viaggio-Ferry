const mongoose = require("mongoose")

const ACCOUNT_TYPES = ["Cash", "Bank", "Credit Card", "Mobile Wallet"]
const STATUS = ["Active", "Inactive"]
const CURRENCIES = ["USD", "EUR", "GBP", "AUD", "CAD", "CHF", "CNY", "INR", "JPY", "SGD", "AED"]

const BankCashAccountSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    layer: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    partnerAccount: {
      type: String,
      default: "N/A",
      trim: true,
    },
    accountType: {
      type: String,
      enum: ACCOUNT_TYPES,
      required: true,
      index: true,
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
      type: String,
      enum: CURRENCIES,
      default: "USD",
      required: true,
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
      index: true,
    },
    status: {
      type: String,
      enum: STATUS,
      default: "Active",
      index: true,
    },
    note: {
      type: String,
      trim: true,
      default: "",
      maxlength: 2000,
    },
    isDeleted: { type: Boolean, default: false, index: true },
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
  BANK_CASH_ACCOUNT_CURRENCIES: CURRENCIES,
}
