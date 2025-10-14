const mongoose = require("mongoose")

const agentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    type: { type: String, enum: ["Company", "Marine", "Commercial", "Selling"], required: true },
    parent: { type: mongoose.Schema.Types.ObjectId, ref: "Agent", default: null },
    depth: { type: Number, default: 0 },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
    isDeleted: { type: Boolean, default: false },
    notes: { type: String, default: "" },
  },
  { timestamps: true },
)

agentSchema.index({ name: "text", code: "text" })

module.exports = mongoose.model("Agent", agentSchema)
