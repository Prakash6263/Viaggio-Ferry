const mongoose = require("mongoose")

const PROMOTION_STATUS = ["Active", "Inactive"]
const PROMOTION_BASIS = ["Period", "Trip"]
const VALUE_TYPES = ["percentage", "fixed"]

const BenefitSchema = new mongoose.Schema(
  {
    isEnabled: { type: Boolean, default: false },
    valueType: { type: String, enum: VALUE_TYPES, default: "percentage" },
    value: { type: Number, default: 0, min: 0 },
  },
  { _id: false },
)

const ServiceBenefitSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    valueType: { type: String, enum: VALUE_TYPES, required: true },
    value: { type: Number, required: true, min: 0 },
  },
  { _id: false },
)

const AuditTrailSchema = new mongoose.Schema(
  {
    id: { type: mongoose.Schema.Types.ObjectId, required: true },
    name: { type: String, required: true },
    type: { type: String, enum: ["user", "company"], required: true },
  },
  { _id: false },
)

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
    promotionBasis: { type: String, enum: PROMOTION_BASIS, required: true },

    trip: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trip",
      default: null,
    },

    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },

    status: { type: String, enum: PROMOTION_STATUS, default: "Active" },

    passengerBenefit: { type: BenefitSchema, default: { isEnabled: false } },
    cargoBenefit: { type: BenefitSchema, default: { isEnabled: false } },
    vehicleBenefit: { type: BenefitSchema, default: { isEnabled: false } },

    serviceBenefits: [ServiceBenefitSchema],

    isDeleted: { type: Boolean, default: false },
    createdBy: { type: AuditTrailSchema, default: null },
    updatedBy: { type: AuditTrailSchema, default: null },
  },
  { timestamps: true },
)

// Indexes as per requirement
PromotionSchema.index({ company: 1, status: 1 })
PromotionSchema.index({ company: 1, startDate: 1, endDate: 1 })
PromotionSchema.index({ company: 1, isDeleted: 1 })
PromotionSchema.index({ company: 1, trip: 1 })

module.exports = {
  PROMOTION_STATUS,
  PROMOTION_BASIS,
  VALUE_TYPES,
  Promotion: mongoose.model("Promotion", PromotionSchema),
}
