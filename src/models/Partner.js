const mongoose = require("mongoose")

const partnerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    layer: { type: String, enum: ["Marine", "Commercial", "Selling"], required: true },
    parentAccount: { type: mongoose.Schema.Types.ObjectId, ref: "Partner", default: null },
    partnerStatus: { type: String, enum: ["Active", "Inactive"], default: "Active" },
    priceList: { type: String, default: "" },

    creditLimit: {
      limitAmount: { type: Number, default: 0 },
      limitTicket: { type: String, default: "" },
    },

    contactInformation: {
      name: { type: String, default: "" },
      title: { type: String, default: "" },
      phone: { type: String, default: "" },
      email: { type: String, default: "" },
      hotline: { type: String, default: "" },
    },

    users: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    isDeleted: { type: Boolean, default: false },
    notes: { type: String, default: "" },
  },
  { timestamps: true },
)

partnerSchema.index({ name: "text", phone: "text", address: "text" })

module.exports = mongoose.model("Partner", partnerSchema)
