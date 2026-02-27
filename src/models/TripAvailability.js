const mongoose = require("mongoose")

const AVAILABILITY_TYPE = ["passenger", "cargo", "vehicle"]
const PASSENGER_CATEGORIES = ["first_class", "economy", "premium"]
const CARGO_CATEGORIES = ["pallet", "container", "general_cargo"]
const VEHICLE_CATEGORIES = ["car", "truck", "motorcycle", "bus"]

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
      default: undefined,
    },
  },
  { _id: false }
)

const tripAvailabilitySchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    trip: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trip",
      required: true,
      index: true,
    },
    // Availability type: passenger, cargo, or vehicle
    type: {
      type: String,
      enum: AVAILABILITY_TYPE,
      required: true,
      index: true,
    },
    // Category based on type
    // For passenger: first_class, economy, premium
    // For cargo: pallet, container, general_cargo
    // For vehicle: car, truck, motorcycle, bus
    category: {
      type: String,
      required: true,
      trim: true,
    },
    // Number of seats/spots available
    seats: {
      type: Number,
      required: true,
      min: 1,
    },
    // Allocated seats (booked/reserved)
    allocatedSeats: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Agent allocation reference
    allocatedAgent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Agent",
      default: null,
    },
    // Notes/remarks
    remarks: String,
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

// Indexes for common queries
tripAvailabilitySchema.index({ company: 1, trip: 1 })
tripAvailabilitySchema.index({ company: 1, trip: 1, type: 1 })
tripAvailabilitySchema.index({ company: 1, trip: 1, isDeleted: 1 })
tripAvailabilitySchema.index({ trip: 1, type: 1, category: 1 }, { unique: false })

module.exports = {
  TripAvailability: mongoose.model("TripAvailability", tripAvailabilitySchema),
  AVAILABILITY_TYPE,
  PASSENGER_CATEGORIES,
  CARGO_CATEGORIES,
  VEHICLE_CATEGORIES,
}
