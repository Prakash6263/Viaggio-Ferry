const mongoose = require("mongoose")

const APPLIED_TO_LAYERS = ["Company", "Marine Agent", "Commercial Agent", "Selling Agent"]
const COMMISSION_FLOW = ["Company", "Marine Agent", "Commercial Agent", "Selling Agent", "Salesman"]
const RULE_STATUS = ["Active", "Inactive"]

const RouteSchema = new mongoose.Schema(
  {
    from: { type: String, required: true, trim: true },
    to: { type: String, required: true, trim: true },
  },
  { _id: false },
)

const CommissionRuleSchema = new mongoose.Schema(
  {
    ruleName: { type: String, required: true, trim: true, maxlength: 100 },

    // Provider & Layer Configuration
    provider: { type: mongoose.Schema.Types.ObjectId, ref: "Partner", required: true },
    appliedToLayer: { type: String, enum: APPLIED_TO_LAYERS, required: true },
    partner: { type: mongoose.Schema.Types.ObjectId, ref: "Partner", default: null }, // null = All Child Partners

    // Commission Value (percentage only)
    commissionValue: { type: Number, required: true, min: 0, max: 100 },

    // Service Type Selection
    serviceTypes: { type: [String], enum: ["Passenger", "Cargo", "Vehicle"], default: [] },

    // Route & Visa (simpler than Markup/Discount)
    visaType: { type: String, trim: true, default: null },
    routes: { type: [RouteSchema], default: [] },

    // Commission Flow - which layers receive commission
    commissionFlow: { type: [String], enum: COMMISSION_FLOW, default: [] },

    // Timing
    effectiveDate: { type: Date, required: true },
    expiryDate: { type: Date, default: null },

    // Status
    status: { type: String, enum: RULE_STATUS, default: "Active" },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true },
)

// Indexes for efficient querying
CommissionRuleSchema.index({ provider: 1, status: 1, isDeleted: 1 })
CommissionRuleSchema.index({ appliedToLayer: 1, partner: 1 })
CommissionRuleSchema.index({ effectiveDate: 1, expiryDate: 1 })
CommissionRuleSchema.index({ serviceTypes: 1 })
CommissionRuleSchema.index({ ruleName: "text" })

module.exports = {
  APPLIED_TO_LAYERS,
  COMMISSION_FLOW,
  RULE_STATUS,
  CommissionRule: mongoose.model("CommissionRule", CommissionRuleSchema),
}
