const mongoose = require("mongoose")

const TripTicketingRuleSchema = new mongoose.Schema(
  {
    trip: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trip",
      required: true,
      index: true,
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    // Reference to global ticketing rule
    ticketingRule: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TicketingRule",
      required: true,
    },
    // Rule details (denormalized for easy access and to handle rule changes over time)
    ruleType: {
      type: String,
      enum: ["VOID", "REFUND", "REISSUE"],
      required: true,
    },
    ruleName: {
      type: String,
      required: true,
      trim: true,
    },
    // Position/order in trip (for UI ordering)
    position: {
      type: Number,
      default: 0,
    },
    // Metadata for tracking
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true }
)

// Indexes
TripTicketingRuleSchema.index({ trip: 1, company: 1 })
TripTicketingRuleSchema.index({ trip: 1, isDeleted: 1 })
TripTicketingRuleSchema.index({ company: 1, isDeleted: 1 })

// Middleware: auto-filter deleted records
TripTicketingRuleSchema.pre("find", function () {
  this.where({ isDeleted: false })
})

TripTicketingRuleSchema.pre("findOne", function () {
  this.where({ isDeleted: false })
})

module.exports = {
  TripTicketingRule: mongoose.model("TripTicketingRule", TripTicketingRuleSchema),
}
