const mongoose = require("mongoose")

const RateSchema = new mongoose.Schema(
  {
    at: { type: Date, required: true, index: true },
    rateUSD: { type: Number, required: true, min: 0 },
  },
  { _id: true },
)

const CurrencySchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      minlength: 3,
      maxlength: 3,
    },
    name: { type: String, required: true, trim: true },
    rates: { type: [RateSchema], default: [] },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } },
)

// Virtuals for latest rate and last update time
CurrencySchema.virtual("lastRateUpdate").get(function () {
  if (!this.rates?.length) return null
  const latest = [...this.rates].sort((a, b) => b.at - a.at)[0]
  return latest?.at || null
})

CurrencySchema.virtual("currentRateUSD").get(function () {
  if (!this.rates?.length) return null
  const latest = [...this.rates].sort((a, b) => b.at - a.at)[0]
  return latest?.rateUSD ?? null
})

// Normalize code and keep rates sorted ascending by time
CurrencySchema.pre("save", function (next) {
  if (this.code) this.code = String(this.code).toUpperCase()
  if (Array.isArray(this.rates)) {
    this.rates = this.rates
      .map((r) => ({ at: new Date(r.at), rateUSD: Number(r.rateUSD) }))
      .filter((r) => r.at instanceof Date && !isNaN(r.at.getTime()) && isFinite(r.rateUSD) && r.rateUSD >= 0)
      .sort((a, b) => a.at - b.at)
  }
  next()
})

CurrencySchema.index({ code: "text", name: "text" })

function getEffectiveRateAt(rates = [], atDate) {
  if (!rates.length) return null
  const at = atDate ? new Date(atDate) : new Date()
  if (!(at instanceof Date) || isNaN(at.getTime())) return null
  let found = null
  for (let i = 0; i < rates.length; i++) {
    const r = rates[i]
    if (r.at <= at) found = r
    else break
  }
  return found
}

CurrencySchema.methods.effectiveRateAt = function (atDate) {
  const sorted = [...(this.rates || [])].sort((a, b) => a.at - b.at)
  return getEffectiveRateAt(sorted, atDate)
}

module.exports = {
  Currency: mongoose.model("Currency", CurrencySchema),
}
