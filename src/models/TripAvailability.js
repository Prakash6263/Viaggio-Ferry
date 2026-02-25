const mongoose = require("mongoose")

const AVAILABILITY_TYPE = ["PASSENGER", "CARGO", "VEHICLE"]

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
    },
    availabilityType: {
      type: String,
      enum: AVAILABILITY_TYPE,
      required: true,
      index: true,
    },
    cabinId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Cabin",
      required: true,
    },
    totalCapacity: {
      type: Number,
      required: true,
      min: 0,
    },
    bookedQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    // totalAllocatedToAgents is calculated from TripAgentAllocation sum
    // remainingCapacity = totalCapacity - bookedQuantity - totalAllocatedToAgents
    remainingCapacity: {
      type: Number,
      required: true,
      min: 0,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true }
)

tripAvailabilitySchema.index({ company: 1, trip: 1 })
tripAvailabilitySchema.index({ trip: 1, cabinId: 1 })
tripAvailabilitySchema.index({ company: 1, trip: 1, availabilityType: 1 })

module.exports = {
  TripAvailability: mongoose.model("TripAvailability", tripAvailabilitySchema),
  AVAILABILITY_TYPE,
}
