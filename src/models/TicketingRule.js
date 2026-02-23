const mongoose = require("mongoose")

const RULE_TYPES = ["VOID", "REFUND", "REISSUE"]
const PENALTY_TYPES = ["NONE", "FIXED", "PERCENTAGE"]

const PenaltyConfigSchema = new mongoose.Schema(
  {
    type: { type: String, enum: PENALTY_TYPES, default: "NONE" },
    value: { type: Number, default: 0, min: 0 },
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
    normalFee: {
      type: PenaltyConfigSchema,
      default: { type: "NONE", value: 0 },
    },
    restrictedPenalty: {
      type: PenaltyConfigSchema,
      default: { type: "NONE", value: 0 },
    },
    noShowPenalty: {
      type: PenaltyConfigSchema,
      default: { type: "NONE", value: 0 },
    },
    conditions: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
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
  PENALTY_TYPES,
  TicketingRule: mongoose.model("TicketingRule", TicketingRuleSchema),
}
