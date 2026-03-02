const mongoose = require("mongoose")

const AVAILABILITY_TYPE = ["passenger", "cargo", "vehicle"]

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
    // Array of cabin allocations with their seat counts
    cabins: [
      {
        cabin: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Cabin",
          required: true,
        },
        seats: {
          type: Number,
          required: true,
          min: 1,
        },
        allocatedSeats: {
          type: Number,
          default: 0,
          min: 0,
        },
        _id: false,
      },
    ],
    // Partner allocation reference
    allocatedAgent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Partner",
      default: null,
    },
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

module.exports = {
  TripAvailability: mongoose.model("TripAvailability", tripAvailabilitySchema),
  AVAILABILITY_TYPE,
}
