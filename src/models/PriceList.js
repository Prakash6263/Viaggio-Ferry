const mongoose = require("mongoose")

const priceListSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    type: {
      type: String,
      enum: ["Passenger", "Vehicle", "Cargo"],
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    effectiveDate: {
      type: Date,
      required: true,
    },
    taxBase: {
      type: String,
      enum: ["Fare Only", "Fare & Taxes"],
      default: "Fare Only",
    },
    ticketForm: {
      type: String,
      enum: ["Refundable", "Non Refundable"],
      default: "Refundable",
    },
    currency: {
      type: String,
      default: "USD",
      trim: true,
    },
    status: {
      type: String,
      enum: ["Active", "Inactive", "Draft"],
      default: "Draft",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true },
)

module.exports = mongoose.model("PriceList", priceListSchema)
