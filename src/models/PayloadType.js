const mongoose = require("mongoose")

const PAYLOAD_CATEGORIES = ["Passenger", "Cargo", "Vehicle"]
const STATUS = ["Active", "Inactive"]

const PayloadTypeSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    code: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      minlength: 2,
      maxlength: 5,
    },
    description: { type: String, trim: true, default: "", maxlength: 4000 },
    category: { type: String, enum: PAYLOAD_CATEGORIES, required: true, index: true },
    maxWeightKg: { type: Number, min: 0, default: 0 },
    dimensions: { type: String, trim: true, default: "", maxlength: 255 },
    status: { type: String, enum: STATUS, default: "Active", index: true },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
)

PayloadTypeSchema.index({ company: 1, code: 1 }, { unique: true })
PayloadTypeSchema.index({ company: 1, name: "text", code: "text", description: "text" })

module.exports = {
  PayloadType: mongoose.model("PayloadType", PayloadTypeSchema),
  PAYLOAD_CATEGORIES,
  PAYLOAD_STATUS: STATUS,
}
