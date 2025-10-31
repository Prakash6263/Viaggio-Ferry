const mongoose = require("mongoose")

const userSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    fullName: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    position: { type: String, default: "", trim: true },
    agent: { type: mongoose.Schema.Types.ObjectId, ref: "Agent", default: null },
    isSalesman: { type: Boolean, default: false },
    remarks: { type: String, default: "" },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
    isDeleted: { type: Boolean, default: false },
    accessGroups: [{ type: mongoose.Schema.Types.ObjectId, ref: "AccessGroup" }],
  },
  { timestamps: true },
)

userSchema.index({ company: 1, email: 1 }, { unique: true, partialFilterExpression: { isDeleted: { $eq: false } } })
userSchema.index({ fullName: "text", email: "text", position: "text" })
userSchema.index({ company: 1, status: 1 })

module.exports = mongoose.model("User", userSchema)
