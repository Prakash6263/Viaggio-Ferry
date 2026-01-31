const mongoose = require("mongoose")

const CABIN_TYPES = ["passenger", "vehicle", "cargo"]
const STATUS = ["Active", "Inactive"]

const CreatorSchema = new mongoose.Schema(
  {
    id: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    name: {
      type: String,
      default: "Unknown",
    },
    type: {
      type: String,
      enum: ["company", "user", "system"],
      default: "system",
    },
    layer: {
      type: String,
      default: undefined, // NO ENUM — free-form
    },
  },
  { _id: false }
)

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
    status: { type: String, enum: STATUS, default: "Active", index: true },
    createdBy: {
      type: CreatorSchema,
      default: () => ({
        id: null,
        name: "Unknown",
        type: "system",
        layer: undefined,
      }),
    },
    updatedBy: {
      type: CreatorSchema,
      default: null,
    },
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
