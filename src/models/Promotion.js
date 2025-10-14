const mongoose = require("mongoose")

const PROMOTION_STATUS = ["Active", "Inactive"]
const PROMOTION_BASIS = ["PERIOD", "TRIP"]
const RULE_TYPE = ["QUANTITY", "TOTAL_VALUE"]
const DISCOUNT_TYPE = ["PERCENT", "AMOUNT"]
const PASSENGER_TYPES = ["Adult", "Child", "Senior", "Student"]
const CABIN_CLASSES = ["Economy", "Business", "Suite"]
const CARGO_TYPES = ["General Goods", "Hazardous", "Refrigerated", "Oversized"]
const VEHICLE_TYPES = ["Car", "Motorcycle", "RV", "Truck"]

const DiscountSchema = new mongoose.Schema(
  {
    type: { type: String, enum: DISCOUNT_TYPE, required: true },
    value: { type: Number, required: true, min: 0 },
  },
  { _id: false },
)

const PassengerQuantityRuleSchema = new mongoose.Schema(
  {
    buyX: { type: Number, required: true, min: 1 },
    getY: { type: Number, required: true, min: 1 },
  },
  { _id: false },
)

const PassengerTotalValueRuleSchema = new mongoose.Schema(
  {
    minAmount: { type: Number, required: true, min: 0 },
    discount: { type: DiscountSchema, required: true },
  },
  { _id: false },
)

const PassengerTicketsSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: false },
    ruleType: { type: String, enum: RULE_TYPE },
    quantityRule: { type: PassengerQuantityRuleSchema, default: undefined },
    totalValueRule: { type: PassengerTotalValueRuleSchema, default: undefined },
  },
  { _id: false },
)

const CargoTicketsSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: false },
    ruleType: { type: String, enum: RULE_TYPE },
    quantityRule: { type: PassengerQuantityRuleSchema, default: undefined },
    totalValueRule: { type: PassengerTotalValueRuleSchema, default: undefined },
  },
  { _id: false },
)

const VehicleTicketsSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: false },
    ruleType: { type: String, enum: RULE_TYPE },
    quantityRule: { type: PassengerQuantityRuleSchema, default: undefined },
    totalValueRule: { type: PassengerTotalValueRuleSchema, default: undefined },
  },
  { _id: false },
)

const EligibilityConditionSchema = new mongoose.Schema(
  {
    passengerType: { type: String, enum: PASSENGER_TYPES, required: true },
    cabinClass: { type: String, enum: CABIN_CLASSES, required: true },
  },
  { _id: false },
)

const CargoEligibilityConditionSchema = new mongoose.Schema(
  {
    cargoType: { type: String, enum: CARGO_TYPES, required: true },
  },
  { _id: false },
)

const VehicleEligibilityConditionSchema = new mongoose.Schema(
  {
    vehicleType: { type: String, enum: VEHICLE_TYPES, required: true },
  },
  { _id: false },
)

const PeriodSchema = new mongoose.Schema(
  {
    startAt: { type: Date, required: true },
    endAt: { type: Date, required: true },
  },
  { _id: false },
)

const PromotionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, trim: true, maxlength: 1000 },
    status: { type: String, enum: PROMOTION_STATUS, default: "Active" },
    basis: { type: String, enum: PROMOTION_BASIS, required: true },

    // basis-specific fields
    period: { type: PeriodSchema, default: undefined }, // when basis=PERIOD
    tripId: { type: mongoose.Schema.Types.ObjectId, ref: "Trip", default: undefined }, // when basis=TRIP

    // benefits & eligibility
    passengerTickets: { type: PassengerTicketsSchema, default: { enabled: false } },
    eligibilityConditions: { type: [EligibilityConditionSchema], default: [] },
    cargoTickets: { type: CargoTicketsSchema, default: { enabled: false } },
    cargoEligibilityConditions: { type: [CargoEligibilityConditionSchema], default: [] },
    vehicleTickets: { type: VehicleTicketsSchema, default: { enabled: false } },
    vehicleEligibilityConditions: { type: [VehicleEligibilityConditionSchema], default: [] },

    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true },
)

PromotionSchema.index({ status: 1, isDeleted: 1 })
PromotionSchema.index({ basis: 1, "period.startAt": 1, "period.endAt": 1 })
PromotionSchema.index({ tripId: 1 })
PromotionSchema.index({ name: "text", description: "text" })

module.exports = {
  PROMOTION_STATUS,
  PROMOTION_BASIS,
  RULE_TYPE,
  DISCOUNT_TYPE,
  PASSENGER_TYPES,
  CABIN_CLASSES,
  CARGO_TYPES,
  VEHICLE_TYPES,
  Promotion: mongoose.model("Promotion", PromotionSchema),
}
