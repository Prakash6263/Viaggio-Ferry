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
    ruleName: { type: String, required: true, trim: true, maxlength: 100 },
    ruleType: { type: String, enum: RULE_TYPES, required: true },
    valueType: { type: String, enum: VALUE_TYPES, default: "PERCENT" },
    value: { type: Number, required: true, min: 0 },

    // Provider & Layer Configuration
    provider: { type: mongoose.Schema.Types.ObjectId, ref: "Partner", required: true },
    appliedToLayer: { type: String, enum: APPLIED_TO_LAYERS, required: true },
    partner: { type: mongoose.Schema.Types.ObjectId, ref: "Partner", default: null }, // null = All Child Partners

    // Commission
    commissionValue: { type: Number, default: 0, min: 0 }, // percentage

    // Service Type Selection
    serviceTypes: { type: [String], enum: ["Passenger", "Cargo", "Vehicle"], default: [] },

    // Conditions (all optional - if empty, applies to all)
    passengerCabins: { type: [String], enum: CABIN_CLASSES, default: [] },
    passengerTypes: { type: [String], enum: PASSENGER_TYPES, default: [] },
    cargoTypes: { type: [String], enum: CARGO_TYPES, default: [] },
    vehicleTypes: { type: [String], enum: VEHICLE_TYPES, default: [] },

    // Route & Visa
    visaType: { type: String, trim: true, default: null },
    routes: { type: [RouteSchema], default: [] },

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
MarkupDiscountRuleSchema.index({ provider: 1, status: 1, isDeleted: 1 })
MarkupDiscountRuleSchema.index({ appliedToLayer: 1, partner: 1 })
MarkupDiscountRuleSchema.index({ effectiveDate: 1, expiryDate: 1 })
MarkupDiscountRuleSchema.index({ serviceTypes: 1 })
MarkupDiscountRuleSchema.index({ ruleName: "text" })

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
