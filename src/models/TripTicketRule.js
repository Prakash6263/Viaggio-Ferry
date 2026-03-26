const mongoose = require("mongoose")

const CreatorSchema = new mongoose.Schema(
  {
    id: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    name: {
      type: String,
      default: "Unknown",
    },
    type: {
      type: String,
      enum: ["company", "user", "system"],
      default: "system",
    },
    layer: {
      type: String,
      default: undefined,
    },
  },
  { _id: false }
)

const tripTicketRuleSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    trip: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trip",
      required: true,
      index: true,
    },
    ruleType: {
      type: String,
      enum: ["VOID", "REFUND", "REISSUE"],
      required: true,
    },
    ticketingRule: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TicketingRule",
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // Audit
    createdBy: {
      type: CreatorSchema,
      default: () => ({
        id: null,
        name: "Unknown",
        type: "system",
        layer: undefined,
      }),
    },
    updatedBy: {
      type: CreatorSchema,
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
tripTicketRuleSchema.index({ company: 1, trip: 1, ruleType: 1 }, { unique: true })
tripTicketRuleSchema.index({ company: 1, trip: 1, isDeleted: 1 })

module.exports = {
  TripTicketRule: mongoose.model("TripTicketRule", tripTicketRuleSchema),
}
