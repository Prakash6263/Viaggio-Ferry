const mongoose = require("mongoose")

// Schema for exchange rate entry with date and time
const ExchangeRateSchema = new mongoose.Schema(
  {
    _id: false,
    rate: {
      type: Number,
      required: true,
      min: 0,
    },
    rateDate: {
      type: Date,
      required: true,
      index: true,
    },
    baseUnit: {
      type: String,
      default: "USD", // Base unit for the rate (e.g., 1 USD = X currency)
    },
  },
  { timestamps: false },
)

const CompanyCurrencySchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    // Global currency reference
    currency: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Currency",
      required: true,
    },

    // Currency details (denormalized for quick access)
    currencyCode: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      minlength: 3,
      maxlength: 3,
    },

    currencyName: {
      type: String,
      required: true,
      trim: true,
    },

    isDefault: {
      type: Boolean,
      default: false,
      index: true,
    },

    exchangeRates: [ExchangeRateSchema],

    // Current/Latest exchange rate
    currentRate: {
      type: Number,
      required: true,
      min: 0,
    },

    // Last rate update timestamp
    lastRateUpdate: {
      type: Date,
      default: Date.now,
    },

    // Status
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true },
)

// Indexes for efficient querying
CompanyCurrencySchema.index({ company: 1, currencyCode: 1 }, { unique: true })
CompanyCurrencySchema.index({ company: 1, isDefault: 1 })
CompanyCurrencySchema.index({ company: 1, isActive: 1, isDeleted: 1 })
CompanyCurrencySchema.index({ company: 1, "exchangeRates.rateDate": -1 })

module.exports = mongoose.model("CompanyCurrency", CompanyCurrencySchema)
