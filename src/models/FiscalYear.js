const mongoose = require("mongoose")

const FISCAL_YEAR_STATUS = ["Open", "Closed", "Locked"]
const PERIOD_TYPES = ["Normal", "Adjustment", "Closing"]
const PERIOD_STATUS = ["Open", "Closed", "Locked"]

const AccountingPeriodSchema = new mongoose.Schema(
  {
    periodNo: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    startDate: {
      type: Date,
      required: true,
      index: true,
    },
    endDate: {
      type: Date,
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: PERIOD_TYPES,
      default: "Normal",
      required: true,
    },
    status: {
      type: String,
      enum: PERIOD_STATUS,
      default: "Open",
      required: true,
      index: true,
    },
    closedDate: {
      type: Date,
      default: null,
    },
    closedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      default: "",
      maxlength: 1000,
    },
  },
  { timestamps: true, _id: true },
)

const FiscalYearSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    fiscalYear: {
      type: Number,
      required: true,
      min: 1900,
      max: 2100,
    },
    returnEarningAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChartOfAccount",
      required: true,
    },
    status: {
      type: String,
      enum: FISCAL_YEAR_STATUS,
      default: "Open",
      required: true,
      index: true,
    },
    periods: [AccountingPeriodSchema],
    closedDate: {
      type: Date,
      default: null,
    },
    closedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
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
  { timestamps: true },
)

// Index for unique fiscal year per company
FiscalYearSchema.index({ company: 1, fiscalYear: 1 }, { unique: true })
FiscalYearSchema.index({ company: 1, status: 1 })
FiscalYearSchema.index({ company: 1, isDeleted: 1 })
FiscalYearSchema.index({ company: 1, "periods.status": 1 })

module.exports = {
  FiscalYear: mongoose.model("FiscalYear", FiscalYearSchema),
  FISCAL_YEAR_STATUS,
  PERIOD_TYPES,
  PERIOD_STATUS,
}
