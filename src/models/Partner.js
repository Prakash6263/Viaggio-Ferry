const mongoose = require("mongoose")
const bcrypt = require("bcryptjs")

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

    passwordHash: { type: String, default: null },
  },
  { timestamps: true },
)

partnerSchema.index({ company: 1, layer: 1, role: 1 })
partnerSchema.index({ company: 1, name: "text", phone: "text", address: "text" })

partnerSchema.pre("save", async function (next) {
  // Only hash if password is new or modified
  if (!this.isModified("passwordHash") || !this.passwordHash) {
    return next()
  }

  try {
    // Generate salt and hash password with 10 rounds
    const salt = await bcrypt.genSalt(10)
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt)
    next()
  } catch (error) {
    next(error)
  }
})

partnerSchema.methods.comparePassword = async function (plainPassword) {
  try {
    return await bcrypt.compare(plainPassword, this.passwordHash)
  } catch (error) {
    throw error
  }
}

module.exports = mongoose.model("Partner", partnerSchema)
