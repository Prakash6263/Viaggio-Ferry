const mongoose = require("mongoose")

const cargoBoardingSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    // Reference to check-in
    checkin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CargoCheckin",
      required: true,
    },
    trip: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trip",
      required: true,
      index: true,
    },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CargoBooking",
      required: true,
    },

    // Boarding Reference
    manifestNumber: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    // Boarding Status
    boardingStatus: {
      type: String,
      enum: ["Pending", "PartiallyLoaded", "FullyLoaded", "NoShow"],
      default: "Pending",
      index: true,
    },
    boardedAt: Date,
    boardedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // Cargo Information (denormalized)
    cargo: {
      cargoType: String,
      description: String,
      totalQuantity: Number,
      totalWeight: Number,
      totalVolume: Number,
      shipper: {
        name: String,
        contact: String,
        address: String,
      },
      receiver: {
        name: String,
        contact: String,
        address: String,
      },
    },

    // Trip Information (denormalized)
    tripInfo: {
      vessel: String,
      voyageNo: String,
      from: String,
      to: String,
      etd: Date,
      eta: Date,
    },

    // Loading Items
    items: [
      {
        _id: mongoose.Schema.Types.ObjectId,
        itemNo: Number,
        description: String,
        quantity: Number,
        weight: Number,
        volume: Number,
        containerNo: String,
        loadedQuantity: {
          type: Number,
          default: 0,
        },
        loadedWeight: {
          type: Number,
          default: 0,
        },
        status: {
          type: String,
          enum: ["Pending", "PartiallyLoaded", "FullyLoaded"],
          default: "Pending",
        },
      },
    ],

    // Loading Summary
    loadingSummary: {
      totalItemsPending: Number,
      totalItemsLoaded: Number,
      totalWeightPending: Number,
      totalWeightLoaded: Number,
      loadingPercentage: Number,
    },

    // Audit
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    notes: String,
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true },
)

cargoBoardingSchema.index({ company: 1, trip: 1, boardingStatus: 1 })
cargoBoardingSchema.index({ company: 1, manifestNumber: 1 }, { unique: true })
cargoBoardingSchema.index({ company: 1, checkin: 1 }, { unique: true })
cargoBoardingSchema.index({ company: 1, boardedAt: -1 })

module.exports = mongoose.model("CargoBoarding", cargoBoardingSchema)
