const mongoose = require("mongoose")

const TICKET_TYPE_OPTIONS = ["one_way", "round_trip","return"]
const TAX_FORM_OPTIONS = ["refundable", "non_refundable"]

const priceListDetailSchema = new mongoose.Schema(
  {
    priceList: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PriceList",
      required: true,
      index: true,
    },
    passengerType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PayloadType",
      required: true,
    },
    ticketType: {
      type: String,
      enum: TICKET_TYPE_OPTIONS,
      required: true,
    },
    cabin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Cabin",
      required: true,
    },
    originPort: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Port",
      required: true,
    },
    destinationPort: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Port",
      required: true,
    },
    visaType: {
      type: String,
      trim: true,
    },
    basicPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    taxIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Tax",
      },
    ],
    taxForm: {
      type: String,
      enum: TAX_FORM_OPTIONS,
      default: "refundable",
    },
    allowedLuggagePieces: {
      type: Number,
      default: 0,
      min: 0,
    },
    allowedLuggageWeight: {
      type: Number,
      default: 0,
      min: 0,
    },
    excessLuggagePricePerKg: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    isDisabled: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
)

// Compound index for unique pricing rows
priceListDetailSchema.index(
  {
    priceList: 1,
    passengerType: 1,
    ticketType: 1,
    cabin: 1,
    originPort: 1,
    destinationPort: 1,
    visaType: 1,
  },
  { unique: true, sparse: true },
)

module.exports = {
  PriceListDetail: mongoose.model("PriceListDetail", priceListDetailSchema),
  TICKET_TYPE_OPTIONS,
  TAX_FORM_OPTIONS,
}
