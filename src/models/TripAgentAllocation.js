const mongoose = require("mongoose")

const tripAgentAllocationSchema = new mongoose.Schema(
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
    partner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Partner",
      required: true,
    },
    allocations: [
      {
        availabilityId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "TripAvailability",
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 0,
        },
        soldQuantity: {
          type: Number,
          default: 0,
          min: 0,
        },
      },
    ],
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true }
)

tripAgentAllocationSchema.index({ company: 1, trip: 1, partner: 1 }, { unique: true })
tripAgentAllocationSchema.index({ company: 1, trip: 1 })
tripAgentAllocationSchema.index({ trip: 1, partner: 1 })

module.exports = {
  TripAgentAllocation: mongoose.model("TripAgentAllocation", tripAgentAllocationSchema),
}
