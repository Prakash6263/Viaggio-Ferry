const mongoose = require("mongoose")

const partnerSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    role: {
      type: String,
      enum: [
        "B2C_Marine_Partner",
        "B2B_Marine_Partner",
        "Govt_Marine_Partner",
        "B2C_Commercial_Partner",
        "B2B_Commercial_Partner",
        "Govt_Commercial_Partner",
        "B2C_Selling_Partner",
        "B2B_Selling_Partner",
        "Govt_Selling_Partner",
        "Custom Partner",
      ],
      default: "Custom Partner",
      index: true,
    },
    phone: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    layer: { type: String, enum: ["Marine", "Commercial", "Selling"], required: true },
    parentAccount: { type: mongoose.Schema.Types.ObjectId, ref: "Partner", default: null },
    parentCompany: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "Company",
  default: null,
},
    partnerStatus: { type: String, enum: ["Active", "Inactive"], default: "Active" },
    disabled: { type: Boolean, default: false },
    priceList: { type: String, default: "" },

    creditLimit: {
      limitAmount: { type: Number, default: 0 },
      limitTicket: { type: Number, default: 0 },
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

partnerSchema.index({ company: 1, layer: 1, role: 1 })
partnerSchema.index({ company: 1, name: "text", phone: "text", address: "text" })

module.exports = mongoose.model("Partner", partnerSchema)
