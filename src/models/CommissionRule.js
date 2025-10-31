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
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    ruleName: { type: String, required: true, trim: true, maxlength: 100 },

    provider: { type: mongoose.Schema.Types.ObjectId, ref: "Partner", required: true },
    appliedToLayer: { type: String, enum: APPLIED_TO_LAYERS, required: true },
    partner: { type: mongoose.Schema.Types.ObjectId, ref: "Partner", default: null },

    commissionValue: { type: Number, required: true, min: 0, max: 100 },

    serviceTypes: { type: [String], enum: ["Passenger", "Cargo", "Vehicle"], default: [] },

    visaType: { type: String, trim: true, default: null },
    routes: { type: [RouteSchema], default: [] },

    commissionFlow: { type: [String], enum: COMMISSION_FLOW, default: [] },

    effectiveDate: { type: Date, required: true },
    expiryDate: { type: Date, default: null },

    status: { type: String, enum: RULE_STATUS, default: "Active" },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true },
)

CommissionRuleSchema.index({ company: 1, provider: 1, status: 1, isDeleted: 1 })
CommissionRuleSchema.index({ company: 1, appliedToLayer: 1, partner: 1 })
CommissionRuleSchema.index({ company: 1, effectiveDate: 1, expiryDate: 1 })
CommissionRuleSchema.index({ company: 1, serviceTypes: 1 })
CommissionRuleSchema.index({ company: 1, ruleName: "text" })

module.exports = {
  APPLIED_TO_LAYERS,
  COMMISSION_FLOW,
  RULE_STATUS,
  CommissionRule: mongoose.model("CommissionRule", CommissionRuleSchema),
}
