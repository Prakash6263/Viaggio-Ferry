const mongoose = require("mongoose")

const CABIN_TYPES = ["Passengers", "Vehicles", "Cargo"]
const STATUS = ["Active", "Inactive"]

const CabinSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: "", maxlength: 4000 },
    remarks: { type: String, trim: true, default: "", maxlength: 2000 },
    type: { type: String, enum: CABIN_TYPES, required: true, index: true },
    status: { type: String, enum: STATUS, default: "Inactive", index: true },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
)

CabinSchema.index({ company: 1, name: "text", description: "text" })
CabinSchema.index({ company: 1, type: 1, status: 1 })

module.exports = {
  Cabin: mongoose.model("Cabin", CabinSchema),
  CABIN_TYPES,
  CABIN_STATUS: STATUS,
}
