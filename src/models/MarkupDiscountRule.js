const mongoose = require("mongoose")

const RULE_TYPES = ["Markup", "Discount"]
const VALUE_TYPES = ["percentage", "fixed"]
const APPLIED_LAYERS = ["Company", "Marine Agent", "Commercial Agent", "Selling Agent"]
const RULE_STATUS = ["Active", "Inactive"]

const MarkupDiscountRuleSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    ruleName: { type: String, required: true, trim: true, maxlength: 200 },
    ruleType: { type: String, enum: RULE_TYPES, required: true },
    valueType: { type: String, enum: VALUE_TYPES, default: "percentage" },
    ruleValue: { type: Number, required: true, min: 0 },

    providerType: { type: String, enum: ["Company", "Partner"], required: true },
    providerCompany: { type: mongoose.Schema.Types.ObjectId, ref: "Company", default: null },
    providerPartner: { type: mongoose.Schema.Types.ObjectId, ref: "Partner", default: null },
    appliedLayer: { type: String, enum: APPLIED_LAYERS, required: true },
    partnerScope: { type: String, enum: ["AllChildPartners", "SpecificPartner"], required: true },
    partner: { type: mongoose.Schema.Types.ObjectId, ref: "Partner", default: null },

    serviceDetails: {
      passenger: [
        {
          cabinId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Cabin",
          },
        },
      ],
      cargo: [
        {
          cabinId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Cabin",
          },
        },
      ],
      vehicle: [
        {
          cabinId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Cabin",
          },
        },
      ],
    },

    visaType: { type: String, trim: true, default: null },
    routeFrom: { type: mongoose.Schema.Types.ObjectId, ref: "Port", required: true },
    routeTo: { type: mongoose.Schema.Types.ObjectId, ref: "Port", required: true },

    effectiveDate: { type: Date, required: true },
    expiryDate: { type: Date, default: null },
    priority: { type: Number, default: 1, min: 1 },

    status: { type: String, enum: RULE_STATUS, default: "Active" },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
)

MarkupDiscountRuleSchema.index({ company: 1, providerCompany: 1, status: 1, isDeleted: 1 })
MarkupDiscountRuleSchema.index({ company: 1, providerPartner: 1, status: 1, isDeleted: 1 })
MarkupDiscountRuleSchema.index({ company: 1, providerCompany: 1, appliedLayer: 1 })
MarkupDiscountRuleSchema.index({ company: 1, providerPartner: 1, appliedLayer: 1 })
MarkupDiscountRuleSchema.index({ company: 1, appliedLayer: 1, partner: 1 })
MarkupDiscountRuleSchema.index({ company: 1, effectiveDate: 1, expiryDate: 1 })
MarkupDiscountRuleSchema.index({ company: 1, "serviceDetails.passenger": 1 })
MarkupDiscountRuleSchema.index({ company: 1, "serviceDetails.cargo": 1 })
MarkupDiscountRuleSchema.index({ company: 1, "serviceDetails.vehicle": 1 })
MarkupDiscountRuleSchema.index({ company: 1, routeFrom: 1, routeTo: 1 })
MarkupDiscountRuleSchema.index({ company: 1, ruleName: "text" })
// Compound index for duplicate detection (without array fields - MongoDB limitation)
MarkupDiscountRuleSchema.index({
  company: 1,
  providerCompany: 1,
  providerPartner: 1,
  appliedLayer: 1,
  routeFrom: 1,
  routeTo: 1,
  visaType: 1,
})

module.exports = {
  RULE_TYPES,
  VALUE_TYPES,
  APPLIED_LAYERS,
  RULE_STATUS,
  MarkupDiscountRule: mongoose.model("MarkupDiscountRule", MarkupDiscountRuleSchema),
}
