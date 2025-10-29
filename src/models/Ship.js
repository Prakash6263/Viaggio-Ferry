const mongoose = require("mongoose")

const SHIP_STATUS = ["Active", "Inactive"]
const SHIP_TYPES = ["Container", "Bulk Carrier", "Tanker", "General Cargo", "Passenger", "RoRo", "Refrigerated"]
const CABIN_TYPES = ["First Class", "Business Class", "Economy", "Standard"]
const CARGO_TYPES = ["Pallet", "Container", "Breakbulk", "Breakbulk"]
const VEHICLE_TYPES = ["Car", "Truck", "Motorcycle", "Bus"]

const ShipSchema = new mongoose.Schema(
  {
    // General Information
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    imoNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    mmsiNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    flagState: {
      type: String,
      required: true,
      trim: true,
    },
    shipType: {
      type: String,
      enum: SHIP_TYPES,
      required: true,
    },
    yearBuilt: {
      type: Number,
      required: true,
      min: 1900,
      max: new Date().getFullYear(),
    },
    classificationSociety: {
      type: String,
      trim: true,
      default: "",
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
      default: "",
      maxlength: 2000,
    },

    // Technical Specifications
    grossTonnage: {
      type: Number,
      required: true,
      min: 0,
    },
    netTonnage: {
      type: Number,
      required: true,
      min: 0,
    },
    lengthOverall: {
      type: Number,
      required: true,
      min: 0,
      description: "Length Overall (LOA) in meters",
    },
    beam: {
      type: Number,
      required: true,
      min: 0,
      description: "Beam width in meters",
    },
    draft: {
      type: Number,
      required: true,
      min: 0,
      description: "Draft depth in meters",
    },

    // Passenger Capacity
    passengerCapacity: [
      {
        _id: mongoose.Schema.Types.ObjectId,
        cabinType: {
          type: String,
          enum: CABIN_TYPES,
          required: true,
        },
        totalWeight: {
          type: Number,
          required: true,
          min: 0,
          description: "Total weight in kg",
        },
        numberOfSeats: {
          type: Number,
          required: true,
          min: 0,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Cargo Capacity
    cargoCapacity: [
      {
        _id: mongoose.Schema.Types.ObjectId,
        cargoType: {
          type: String,
          enum: CARGO_TYPES,
          required: true,
        },
        totalWeight: {
          type: Number,
          required: true,
          min: 0,
          description: "Total weight in metric tons",
        },
        spots: {
          type: Number,
          required: true,
          min: 0,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Vehicle Capacity
    vehicleCapacity: [
      {
        _id: mongoose.Schema.Types.ObjectId,
        vehicleType: {
          type: String,
          enum: VEHICLE_TYPES,
          required: true,
        },
        totalWeight: {
          type: Number,
          required: true,
          min: 0,
          description: "Total weight in metric tons",
        },
        spots: {
          type: Number,
          required: true,
          min: 0,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true },
)

// Indexes for search and filtering
ShipSchema.index({ name: "text", imoNumber: "text", mmsiNumber: "text" })
ShipSchema.index({ shipType: 1 })
ShipSchema.index({ status: 1 })
ShipSchema.index({ isDeleted: 1 })

module.exports = {
  Ship: mongoose.model("Ship", ShipSchema),
  SHIP_STATUS,
  SHIP_TYPES,
  CABIN_TYPES,
  CARGO_TYPES,
  VEHICLE_TYPES,
}
