const mongoose = require("mongoose")

const agentSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, uppercase: true, trim: true },
    type: { type: String, enum: ["Company", "Marine", "Commercial", "Selling"], required: true },
    parent: { type: mongoose.Schema.Types.ObjectId, ref: "Agent", default: null },
    depth: { type: Number, default: 0 },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
    isDeleted: { type: Boolean, default: false },
    notes: { type: String, default: "" },
  },
  { timestamps: true },
)

agentSchema.index({ company: 1, code: 1 }, { unique: true })
agentSchema.index({ name: "text", code: "text" })
agentSchema.index({ company: 1, status: 1 })

module.exports = mongoose.model("Agent", agentSchema)
