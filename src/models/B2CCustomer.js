const mongoose = require("mongoose")

const b2cCustomerSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    partner: { type: mongoose.Schema.Types.ObjectId, ref: "Partner", required: true },
    nationality: { type: String, required: true, trim: true },
    password: { type: String, required: true },
    whatsappNumber: { type: String, required: true, trim: true },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" },

    address: {
      street: { type: String, default: "" },
      city: { type: String, default: "" },
      country: { type: String, default: "" },
    },

    isDeleted: { type: Boolean, default: false },
    notes: { type: String, default: "" },
  },
  { timestamps: true },
)

b2cCustomerSchema.index({ company: 1, name: "text", whatsappNumber: "text", "address.street": "text" })
b2cCustomerSchema.index({ company: 1, status: 1 })

module.exports = mongoose.model("B2CCustomer", b2cCustomerSchema)
