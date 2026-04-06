const mongoose = require("mongoose")

const CurrencySchema = new mongoose.Schema(
  {
    currencyId: {
      type: Number,
    },

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

    countryName: {
      type: String,
      required: true,
      trim: true,
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
)

/**
 * ✅ Compound unique index with partial filter
 * Same currencyCode allowed
 * Same countryName allowed
 * BUT pair must be unique (excluding deleted records)
 */
CurrencySchema.index(
  { currencyCode: 1, countryName: 1 },
  { unique: true, partialFilterExpression: { isDeleted: { $eq: false } } }
)
CurrencySchema.index({ currencyId: 1 }, { unique: true, partialFilterExpression: { isDeleted: { $eq: false } } })

module.exports = {
  Currency: mongoose.model("Currency", CurrencySchema),
}
