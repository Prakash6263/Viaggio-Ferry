const mongoose = require("mongoose")

const tripTicketRuleSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      indexed: true,
    },
    trip: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trip",
      required: true,
      indexed: true,
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
    isDeleted: {
      type: Boolean,
      default: false,
      indexed: true,
    },
    createdBy: {
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
      layer: String,
    },
    updatedBy: {
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
      layer: String,
    },
  },
  { timestamps: true }
)

// Indexes
tripTicketRuleSchema.index({ company: 1, trip: 1 })
tripTicketRuleSchema.index({ trip: 1, ruleType: 1 }, { unique: true, sparse: true })
tripTicketRuleSchema.index({ company: 1, isDeleted: 1 })

// Pre-find middleware to auto-filter deleted records
tripTicketRuleSchema.pre("find", function () {
  this.where({ isDeleted: false })
})

tripTicketRuleSchema.pre("findOne", function () {
  this.where({ isDeleted: false })
})

tripTicketRuleSchema.pre("findOneAndUpdate", function () {
  this.where({ isDeleted: false })
})

module.exports = {
  TripTicketRule: mongoose.model("TripTicketRule", tripTicketRuleSchema),
}
