const mongoose = require("mongoose")

const PAYLOAD_CATEGORIES = ["passenger", "cargo", "vehicle"]
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
      enum: ["company", "user"],
      default: "user",
    },
    layer: {
      type: String,
      default: undefined, // NO ENUM — free-form
    },
  },
  { _id: false }
)

const PayloadTypeSchema = new mongoose.Schema(
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
    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: 4000,
    },
    category: {
      type: String,
      enum: PAYLOAD_CATEGORIES,
      required: true,
      index: true,
    },
    ageRange: {
      from: {
        type: Number,
        min: 0,
        max: 150,
        default: undefined,
      },
      to: {
        type: Number,
        min: 0,
        max: 150,
        default: undefined,
      },
    },
    maxWeight: {
      type: Number,
      min: 0,
      default: undefined,
    },
    dimensions: {
      type: String,
      trim: true,
      default: undefined,
      maxlength: 255,
    },
    status: {
      type: String,
      enum: STATUS,
      default: "Active",
      index: true,
    },
    createdBy: {
      type: CreatorSchema,
      default: () => ({
        id: null,
        name: "Unknown",
        type: "user",
        layer: undefined,
      }),
    },
    updatedBy: {
      type: CreatorSchema,
      default: null,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true }
)

PayloadTypeSchema.index({ company: 1, code: 1, category: 1 }, { unique: true })
PayloadTypeSchema.index({ company: 1, name: "text", code: "text", description: "text" })
PayloadTypeSchema.index({ company: 1, status: 1 })

module.exports = {
  PayloadType: mongoose.model("PayloadType", PayloadTypeSchema),
  PAYLOAD_CATEGORIES,
  PAYLOAD_STATUS: STATUS,
}
