const mongoose = require("mongoose")

const RULE_TYPES = ["VOID", "REFUND", "REISSUE"]
const PAYLOAD_TYPES = ["PASSENGER", "CARGO", "VEHICLE", "ALL"]
const FEE_TYPES = ["FIXED", "PERCENTAGE"]

const RestrictedPenaltySchema = new mongoose.Schema(
  {
    feeType: { type: String, enum: FEE_TYPES, required: true },
    feeValue: { type: Number, required: true, min: 0 },
  },
  { _id: false }
)

const TicketingRuleSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    ruleType: {
      type: String,
      enum: RULE_TYPES,
      required: true,
    },
    ruleName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    payloadType: {
      type: String,
      enum: PAYLOAD_TYPES,
      default: "ALL",
    },
    sameDayOnly: {
      type: Boolean,
      default: false,
    },
    startOffsetDays: {
      type: Number,
      default: 0,
      min: 0,
    },
    restrictedWindowHours: {
      type: Number,
      required: true,
      min: 0,
    },
    normalFeeType: {
      type: String,
      enum: FEE_TYPES,
      default: null,
    },
    normalFeeValue: {
      type: Number,
      default: null,
      min: 0,
    },
    restrictedPenalty: {
      type: RestrictedPenaltySchema,
      required: true,
    },
    taxRefundable: {
      type: Boolean,
      default: false,
    },
    commissionReversal: {
      type: Boolean,
      default: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
)

// Indexes
TicketingRuleSchema.index({ company: 1, ruleName: 1 }, { unique: true, sparse: true })
TicketingRuleSchema.index({ company: 1, ruleType: 1 })
TicketingRuleSchema.index({ company: 1, payloadType: 1 })
TicketingRuleSchema.index({ company: 1, isDeleted: 1 })

// Middleware: auto-filter deleted records
TicketingRuleSchema.pre("find", function () {
  this.where({ isDeleted: false })
})

TicketingRuleSchema.pre("findOne", function () {
  this.where({ isDeleted: false })
})

module.exports = {
  RULE_TYPES,
  PAYLOAD_TYPES,
  FEE_TYPES,
  TicketingRule: mongoose.model("TicketingRule", TicketingRuleSchema),
}
