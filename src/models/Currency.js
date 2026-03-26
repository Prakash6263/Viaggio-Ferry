const mongoose = require("mongoose")

const CurrencySchema = new mongoose.Schema(
  {
    currencyId: {
      type: Number,
      unique: true,
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
 * ✅ Compound unique index
 * Same currencyCode allowed
 * Same countryName allowed
 * BUT pair must be unique
 */
CurrencySchema.index(
  { currencyCode: 1, countryName: 1 },
  { unique: true }
)

module.exports = {
  Currency: mongoose.model("Currency", CurrencySchema),
}
