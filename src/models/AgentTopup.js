const mongoose = require("mongoose")

const TOPUP_STATUS = ["Pending", "Approved", "Rejected", "Completed", "Cancelled"]
const CONFIRMATION_STATUS = ["Pending", "Confirmed", "Rejected"]

const AgentTopupSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    transactionNo: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      unique: true,
    },
    transactionDate: {
      type: Date,
      required: true,
      index: true,
    },
    payorDetails: {
      partner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Partner",
        required: true,
      },
      ledger: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ChartOfAccount",
        required: true,
      },
      confirmation: {
        type: String,
        enum: CONFIRMATION_STATUS,
        default: "Pending",
      },
    },
    payeeDetails: {
      partner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Partner",
        required: true,
      },
      ledger: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ChartOfAccount",
        required: true,
      },
      confirmation: {
        type: String,
        enum: CONFIRMATION_STATUS,
        default: "Pending",
      },
    },
    amountCurrency: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Currency",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    rateOfExchange: {
      type: Number,
      required: true,
      default: 1,
      min: 0,
    },
    amountSDG: {
      type: Number,
      required: true,
      min: 0,
    },
    notes: {
      type: String,
      trim: true,
      default: "",
      maxlength: 2000,
    },
    documentUpload: {
      fileName: String,
      fileUrl: String,
      uploadedAt: Date,
    },
    status: {
      type: String,
      enum: TOPUP_STATUS,
      default: "Pending",
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    approvalDate: {
      type: Date,
      default: null,
    },
    rejectionReason: {
      type: String,
      trim: true,
      default: "",
    },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
)

AgentTopupSchema.index({ company: 1, transactionNo: 1 }, { unique: true })
AgentTopupSchema.index({ company: 1, transactionDate: 1 })
AgentTopupSchema.index({ company: 1, status: 1 })
AgentTopupSchema.index({ company: 1, "payorDetails.partner": 1 })
AgentTopupSchema.index({ company: 1, "payeeDetails.partner": 1 })

module.exports = {
  AgentTopup: mongoose.model("AgentTopup", AgentTopupSchema),
  TOPUP_STATUS,
  CONFIRMATION_STATUS,
}
