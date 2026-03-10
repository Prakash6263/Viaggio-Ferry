const mongoose = require("mongoose")

const PROVIDER_TYPES = ["Company", "Partner"]
const COMMISSION_TYPES = ["percentage", "fixed"]
const APPLIED_LAYERS = ["Company", "Marine Agent", "Commercial Agent", "Selling Agent"]
const PARTNER_SCOPES = ["AllChildPartners", "SpecificPartner"]
const RULE_STATUS = ["Active", "Inactive"]

const CommissionRuleSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    ruleName: { type: String, required: true, trim: true, maxlength: 200 },

    // Provider configuration
    providerType: { type: String, enum: PROVIDER_TYPES, required: true },
    providerCompany: { type: mongoose.Schema.Types.ObjectId, ref: "Company", default: null },
    providerPartner: { type: mongoose.Schema.Types.ObjectId, ref: "Partner", default: null },

    // Commission configuration
    commissionType: { type: String, enum: COMMISSION_TYPES, required: true },
    commissionValue: { type: Number, required: true },

    // Applied layer and partner scope
    appliedLayer: { type: String, enum: APPLIED_LAYERS, required: true },
    partnerScope: { type: String, enum: PARTNER_SCOPES, required: true },
    partner: { type: mongoose.Schema.Types.ObjectId, ref: "Partner", default: null },

    // Service details
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

    // Route and visa - Support multiple routes per rule
    visaType: { type: String, trim: true, default: null },
    routes: [
      {
        routeFrom: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Port",
          required: true,
        },
        routeTo: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Port",
          required: true,
        },
        _id: false,
      },
    ],

    // Dates and priority
    effectiveDate: { type: Date, required: true },
    expiryDate: { type: Date, default: null },
    priority: { type: Number, default: 1, min: 1 },

    // Status and tracking
    status: { type: String, enum: RULE_STATUS, default: "Active" },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },

    // Audit fields
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
)

// Indexes for efficient querying
CommissionRuleSchema.index({ company: 1, providerCompany: 1, status: 1, isDeleted: 1 })
CommissionRuleSchema.index({ company: 1, providerPartner: 1, status: 1, isDeleted: 1 })
CommissionRuleSchema.index({ company: 1, providerCompany: 1, appliedLayer: 1 })
CommissionRuleSchema.index({ company: 1, providerPartner: 1, appliedLayer: 1 })
CommissionRuleSchema.index({ company: 1, appliedLayer: 1, partner: 1 })
CommissionRuleSchema.index({ company: 1, effectiveDate: 1, expiryDate: 1 })

// Service details indexes
CommissionRuleSchema.index({
  company: 1,
  "serviceDetails.passenger.cabinId": 1,
})

CommissionRuleSchema.index({
  company: 1,
  "serviceDetails.cargo.cabinId": 1,
})

CommissionRuleSchema.index({
  company: 1,
  "serviceDetails.vehicle.cabinId": 1,
})

// Routes indexes for querying by route
CommissionRuleSchema.index({ company: 1, "routes.routeFrom": 1, "routes.routeTo": 1 })
CommissionRuleSchema.index({ company: 1, ruleName: "text" })

// Duplicate detection index - now includes routes array
CommissionRuleSchema.index({
  company: 1,
  providerCompany: 1,
  providerPartner: 1,
  appliedLayer: 1,
  "routes.routeFrom": 1,
  "routes.routeTo": 1,
  visaType: 1,
})

module.exports = {
  PROVIDER_TYPES,
  COMMISSION_TYPES,
  APPLIED_LAYERS,
  PARTNER_SCOPES,
  RULE_STATUS,
  CommissionRule: mongoose.model("CommissionRule", CommissionRuleSchema),
}
