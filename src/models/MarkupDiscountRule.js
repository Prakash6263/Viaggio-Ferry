const mongoose = require("mongoose")

const RULE_TYPES = ["Markup", "Discount"]
const VALUE_TYPES = ["PERCENT", "AMOUNT"]
const APPLIED_TO_LAYERS = ["Company", "Marine Agent", "Commercial Agent", "Selling Agent"]
const PASSENGER_TYPES = ["Adult", "Child", "Infant", "Student", "Senior"]
const CABIN_CLASSES = ["Economy", "Business", "First"]
const CARGO_TYPES = ["General Cargo", "Dangerous Goods", "Perishable Goods", "Livestock", "Refrigerated"]
const VEHICLE_TYPES = ["Car", "Truck", "Motorcycle", "RV", "Trailer"]
const RULE_STATUS = ["Active", "Inactive"]

const RouteSchema = new mongoose.Schema(
  {
    from: { type: String, required: true, trim: true },
    to: { type: String, required: true, trim: true },
  },
  { _id: false },
)

const MarkupDiscountRuleSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    ruleName: { type: String, required: true, trim: true, maxlength: 100 },
    ruleType: { type: String, enum: RULE_TYPES, required: true },
    valueType: { type: String, enum: VALUE_TYPES, default: "PERCENT" },
    value: { type: Number, required: true, min: 0 },

    provider: { type: mongoose.Schema.Types.ObjectId, ref: "Partner", required: true },
    appliedToLayer: { type: String, enum: APPLIED_TO_LAYERS, required: true },
    partner: { type: mongoose.Schema.Types.ObjectId, ref: "Partner", default: null },

    commissionValue: { type: Number, default: 0, min: 0 },

    serviceTypes: { type: [String], enum: ["Passenger", "Cargo", "Vehicle"], default: [] },

    passengerCabins: { type: [String], enum: CABIN_CLASSES, default: [] },
    passengerTypes: { type: [String], enum: PASSENGER_TYPES, default: [] },
    cargoTypes: { type: [String], enum: CARGO_TYPES, default: [] },
    vehicleTypes: { type: [String], enum: VEHICLE_TYPES, default: [] },

    visaType: { type: String, trim: true, default: null },
    routes: { type: [RouteSchema], default: [] },

    effectiveDate: { type: Date, required: true },
    expiryDate: { type: Date, default: null },

    status: { type: String, enum: RULE_STATUS, default: "Active" },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true },
)

MarkupDiscountRuleSchema.index({ company: 1, provider: 1, status: 1, isDeleted: 1 })
MarkupDiscountRuleSchema.index({ company: 1, appliedToLayer: 1, partner: 1 })
MarkupDiscountRuleSchema.index({ company: 1, effectiveDate: 1, expiryDate: 1 })
MarkupDiscountRuleSchema.index({ company: 1, serviceTypes: 1 })
MarkupDiscountRuleSchema.index({ company: 1, ruleName: "text" })

module.exports = {
  RULE_TYPES,
  VALUE_TYPES,
  APPLIED_TO_LAYERS,
  PASSENGER_TYPES,
  CABIN_CLASSES,
  CARGO_TYPES,
  VEHICLE_TYPES,
  RULE_STATUS,
  MarkupDiscountRule: mongoose.model("MarkupDiscountRule", MarkupDiscountRuleSchema),
}
