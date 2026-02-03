const mongoose = require("mongoose")

const SHIP_STATUS = ["Active", "Inactive"]

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
      default: "system",
    },
    layer: {
      type: String,
      default: undefined,
    },
  },
  { _id: false }
)

const ShipSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    // General Information
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    imoNumber: {
      type: String,
      trim: true,
      sparse: true,
      unique: true,
    },
    mmsiNumber: {
      type: String,
      trim: true,
      sparse: true,
      unique: true,
    },

    shipType: {
      type: String,
      trim: true,
    },
    yearBuilt: {
      type: Number,
      min: 1900,
      max: new Date().getFullYear(),
    },
    flagState: {
      type: String,
      trim: true,
    },
    classificationSociety: {
      type: String,
      trim: true,
    },

    status: {
      type: String,
      enum: SHIP_STATUS,
      default: "Active",
      index: true,
    },

    remarks: {
      type: String,
      trim: true,
      maxlength: 2000,
    },

    // Technical Specifications
    technical: {
      grossTonnage: { type: Number, min: 0 },
      netTonnage: { type: Number, min: 0 },
      loa: { type: Number, min: 0, description: "Length Overall in meters" },
      beam: { type: Number, min: 0, description: "Beam width in meters" },
      draft: { type: Number, min: 0, description: "Draft depth in meters" },
    },

    // Passenger Capacity
    passengerCapacity: [
      {
        cabinId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Cabin",
        },
        cabinName: String,
        totalWeightKg: { type: Number, min: 0 },
        seats: { type: Number, min: 0 },
      },
    ],

    // Cargo Capacity
    cargoCapacity: [
      {
        cabinId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Cabin",
        },
        cabinName: String,
        totalWeightTons: { type: Number, min: 0 },
        spots: { type: Number, min: 0 },
      },
    ],

    // Vehicle Capacity
    vehicleCapacity: [
      {
        cabinId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Cabin",
        },
        cabinName: String,
        totalWeightTons: { type: Number, min: 0 },
        spots: { type: Number, min: 0 },
      },
    ],

    // Audit
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

    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true }
)

// Compound indexes
ShipSchema.index({ company: 1, name: "text", imoNumber: "text", flagState: "text" })
ShipSchema.index({ company: 1, status: 1 })
ShipSchema.index({ company: 1, isDeleted: 1 })

module.exports = {
  Ship: mongoose.model("Ship", ShipSchema),
  SHIP_STATUS,
}
