const mongoose = require("mongoose")

const STATUS = ["Active", "Inactive"]

const PortSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
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
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
)

PortSchema.index({ company: 1, code: 1 }, { unique: true })
PortSchema.index({ company: 1, name: "text", code: "text", country: "text" })
PortSchema.index({ company: 1, status: 1 })

module.exports = {
  Port: mongoose.model("Port", PortSchema),
  PORT_STATUS: STATUS,
}
