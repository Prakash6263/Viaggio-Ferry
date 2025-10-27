const mongoose = require("mongoose")

const priceListDetailSchema = new mongoose.Schema(
  {
    priceList: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PriceList",
      required: true,
    },
    typeField: {
      type: String,
      required: true, // Will be "Adult", "Car", "Pallet A", etc.
    },
    ticketType: {
      type: String,
      enum: ["One Way", "Return"],
      required: true,
    },
    cabin: {
      type: String,
      enum: ["Economy", "Business", "First Class", "Standard"],
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
      enum: ["Tourist", "Business", "Student", "N/A"],
      default: "N/A",
    },
    basicPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    taxes: [
      {
        taxType: {
          type: String,
          enum: ["VAT", "Port Tax", "Security Fee", "Fuel Surcharge"],
          required: true,
        },
        amount: {
          type: Number,
          required: true,
          min: 0,
        },
      },
    ],
    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    allowedLuggagePieces: {
      type: Number,
      default: 1,
      min: 0,
    },
    allowedLuggageWeight: {
      type: Number,
      default: 20,
      min: 0,
    },
    excessLuggagePrice: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true },
)

priceListDetailSchema.index(
  {
    priceList: 1,
    typeField: 1,
    ticketType: 1,
    cabin: 1,
    originPort: 1,
    destinationPort: 1,
    visaType: 1,
  },
  { unique: true },
)

module.exports = mongoose.model("PriceListDetail", priceListDetailSchema)
