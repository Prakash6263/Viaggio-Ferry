const mongoose = require("mongoose")

const CABIN_TYPES = ["Passengers", "Vehicles", "Cargo"]
const STATUS = ["Active", "Inactive"]

const CabinSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: "", maxlength: 4000 },
    remarks: { type: String, trim: true, default: "", maxlength: 2000 },
    type: { type: String, enum: CABIN_TYPES, required: true, index: true },
    status: { type: String, enum: STATUS, default: "Inactive", index: true }, // default aligns with UI toggle
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
)

CabinSchema.index({ name: "text", description: "text" })

module.exports = {
  Cabin: mongoose.model("Cabin", CabinSchema),
  CABIN_TYPES,
  CABIN_STATUS: STATUS,
}
