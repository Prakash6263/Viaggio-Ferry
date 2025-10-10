const mongoose = require("mongoose")

const STATUS = ["Active", "Inactive"]

const PortSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      minlength: 2,
      maxlength: 5,
    },
    country: {
      type: String,
      required: true,
      trim: true,
    },
    timezone: {
      // e.g., "UTC+02:00"
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: STATUS,
      default: "Active",
      index: true,
    },
    notes: {
      type: String,
      trim: true,
      default: "",
      maxlength: 2000,
    },
    // Optional soft-delete flag if needed later
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
)

PortSchema.index({ name: "text", code: "text", country: "text" })

module.exports = {
  Port: mongoose.model("Port", PortSchema),
  PORT_STATUS: STATUS,
}
