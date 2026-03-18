const mongoose = require("mongoose")

const PROMOTION_STATUS = ["Active", "Inactive"]
const PROMOTION_BASIS = ["Period", "Trip"]
const CALCULATION_TYPES = ["quantity", "value"]
const DISCOUNT_TYPES = ["percentage", "fixed"]

// Eligibility sub-schema (passenger only)
const EligibilitySchema = new mongoose.Schema(
  {
    passengerTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PayloadType",
      required: true,
    },
    cabinId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Cabin",
      required: true,
    },
  },
  { _id: false },
)

// Passenger service promotion sub-schema
const PassengerPromotionSchema = new mongoose.Schema(
  {
    isEnabled: { type: Boolean, default: false },

    calculationType: {
      type: String,
      enum: CALCULATION_TYPES,
      default: null,
    },

    // Quantity-based fields
    buyX: { type: Number, default: null, min: 0 },
    getY: { type: Number, default: null, min: 0 },

    // Value-based fields
    minValue: { type: Number, default: null, min: 0 },
    discountType: {
      type: String,
      enum: DISCOUNT_TYPES,
      default: null,
    },
    discountValue: { type: Number, default: null, min: 0 },

    // Passenger-specific eligibility
    eligibility: [EligibilitySchema],
  },
  { _id: false },
)

// Cargo service promotion sub-schema
const CargoPromotionSchema = new mongoose.Schema(
  {
    isEnabled: { type: Boolean, default: false },

    calculationType: {
      type: String,
      enum: CALCULATION_TYPES,
      default: null,
    },

    // Quantity-based fields
    buyX: { type: Number, default: null, min: 0 },
    getY: { type: Number, default: null, min: 0 },

    // Value-based fields
    minValue: { type: Number, default: null, min: 0 },
    discountType: {
      type: String,
      enum: DISCOUNT_TYPES,
      default: null,
    },
    discountValue: { type: Number, default: null, min: 0 },
  },
  { _id: false },
)

// Vehicle service promotion sub-schema
const VehiclePromotionSchema = new mongoose.Schema(
  {
    isEnabled: { type: Boolean, default: false },

    calculationType: {
      type: String,
      enum: CALCULATION_TYPES,
      default: null,
    },

    // Quantity-based fields
    buyX: { type: Number, default: null, min: 0 },
    getY: { type: Number, default: null, min: 0 },

    // Value-based fields
    minValue: { type: Number, default: null, min: 0 },
    discountType: {
      type: String,
      enum: DISCOUNT_TYPES,
      default: null,
    },
    discountValue: { type: Number, default: null, min: 0 },
  },
  { _id: false },
)

// Audit trail sub-schema
const AuditTrailSchema = new mongoose.Schema(
  {
    id: { type: mongoose.Schema.Types.ObjectId, required: true },
    name: { type: String, required: true },
    type: { type: String, enum: ["user", "company"], required: true },
  },
  { _id: false },
)

// Main Promotion schema
const PromotionSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    promotionName: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, default: "" },

    status: {
      type: String,
      enum: PROMOTION_STATUS,
      default: "Active",
    },

    promotionBasis: {
      type: String,
      enum: PROMOTION_BASIS,
      required: true,
    },

    trip: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trip",
      default: null,
    },

    // Only required when promotionBasis is "Period"
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },

    // Service promotions - core logic
    servicePromotions: {
      passenger: { type: PassengerPromotionSchema, default: () => ({ isEnabled: false }) },
      cargo: { type: CargoPromotionSchema, default: () => ({ isEnabled: false }) },
      vehicle: { type: VehiclePromotionSchema, default: () => ({ isEnabled: false }) },
    },

    isDeleted: { type: Boolean, default: false },
    createdBy: { type: AuditTrailSchema, default: null },
    updatedBy: { type: AuditTrailSchema, default: null },
  },
  { timestamps: true },
)

// Indexes as per requirement
PromotionSchema.index({ company: 1, status: 1 })
PromotionSchema.index({ company: 1, startDate: 1, endDate: 1 })
PromotionSchema.index({ company: 1, trip: 1 })
PromotionSchema.index({ company: 1, isDeleted: 1 })

module.exports = {
  PROMOTION_STATUS,
  PROMOTION_BASIS,
  CALCULATION_TYPES,
  DISCOUNT_TYPES,
  Promotion: mongoose.model("Promotion", PromotionSchema),
}
