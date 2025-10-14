const mongoose = require("mongoose")

const TAX_STATUS = ["Active", "Inactive"]
const TAX_TYPE = ["%", "Fixed"]
const TAX_FORM = ["Refundable", "Non Refundable"]

const TaxSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, trim: true, uppercase: true, minlength: 1, maxlength: 10 },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    ledgerCode: { type: String, trim: true, maxlength: 20 },
    value: { type: Number, required: true, min: 0 },
    type: { type: String, enum: TAX_TYPE, required: true, default: "%" },
    form: { type: String, enum: TAX_FORM, required: true, default: "Refundable" },
    status: { type: String, enum: TAX_STATUS, default: "Active" },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true },
)

TaxSchema.index({ code: 1 }, { unique: true })
TaxSchema.index({ name: "text", code: "text" })

module.exports = {
  Tax: mongoose.model("Tax", TaxSchema),
  TAX_STATUS,
  TAX_TYPE,
  TAX_FORM,
}
