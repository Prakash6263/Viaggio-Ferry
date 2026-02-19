const mongoose = require("mongoose")

const PRICE_LIST_STATUS = ["active", "inactive"]
const TAX_BASE_OPTIONS = ["fare_only", "fare_plus_tax"]
const CATEGORY_OPTIONS = ["passenger", "vehicle", "cargo"]
const TICKET_TYPE_OPTIONS = ["one_way", "round_trip"]
const TAX_FORM_OPTIONS = ["refundable", "non_refundable"]

const priceListSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    priceListName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    effectiveDateTime: {
      type: Date,
      required: true,
    },
    taxBase: {
      type: String,
      enum: TAX_BASE_OPTIONS,
      required: true,
      default: "fare_only",
    },
    currency: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CompanyCurrency",
      required: true,
    },
    category: {
      type: String,
      enum: CATEGORY_OPTIONS,
      required: true,
    },
    status: {
      type: String,
      enum: PRICE_LIST_STATUS,
      default: "active",
    },
    partners: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Partner",
      },
    ],
    createdBy: {
      id: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
      },
      name: {
        type: String,
        required: true,
        trim: true,
      },
      type: {
        type: String,
        enum: ["company", "user"],
        required: true,
      },
      layer: {
        type: String,
        trim: true,
      },
    },
    updatedBy: {
      id: {
        type: mongoose.Schema.Types.ObjectId,
      },
      name: {
        type: String,
        trim: true,
      },
      type: {
        type: String,
        enum: ["company", "user"],
      },
      layer: {
        type: String,
        trim: true,
      },
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
)

priceListSchema.index({ company: 1, priceListName: 1 })
priceListSchema.index({ company: 1, category: 1 })
priceListSchema.index({ company: 1, status: 1 })
priceListSchema.index({ company: 1, currency: 1 })
priceListSchema.index({ partners: 1 })

module.exports = {
  PriceList: mongoose.model("PriceList", priceListSchema),
  PRICE_LIST_STATUS,
  TAX_BASE_OPTIONS,
  CATEGORY_OPTIONS,
  TICKET_TYPE_OPTIONS,
  TAX_FORM_OPTIONS,
}
