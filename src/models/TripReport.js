const mongoose = require("mongoose")

const tripReportSchema = new mongoose.Schema(
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

    // Report Status
    reportStatus: {
      type: String,
      enum: ["Initiated", "InProgress", "Verified", "Completed"],
      default: "Initiated",
      index: true,
    },

    // Payload Summary (Total weight in KG)
    payloadSummary: {
      totalPassengerLoad: {
        type: Number,
        default: 0,
        description: "Total Passenger + Luggage weight in KG",
      },
      totalCargoWeight: {
        type: Number,
        default: 0,
        description: "Total Cargo weight in KG",
      },
      totalVehiclesWeight: {
        type: Number,
        default: 0,
        description: "Total Vehicles weight in KG",
      },
      grandTotalPayload: {
        type: Number,
        default: 0,
        description: "Sum of all loads in KG",
      },
    },

    // Passenger Manifest Summary
    passengerManifest: {
      totalPassengers: {
        type: Number,
        default: 0,
      },
      totalBoarded: {
        type: Number,
        default: 0,
      },
      totalNoShow: {
        type: Number,
        default: 0,
      },
      manifestRecords: [
        {
          _id: mongoose.Schema.Types.ObjectId,
          passengerName: String,
          ticketNo: String,
          seatNumber: String,
          status: {
            type: String,
            enum: ["BOARDED", "NO_SHOW"],
          },
          weight: Number,
          luggageWeight: Number,
          boardedAt: Date,
        },
      ],
    },

    // Cargo Manifest Summary
    cargoManifest: {
      totalCargo: {
        type: Number,
        default: 0,
      },
      totalLoaded: {
        type: Number,
        default: 0,
      },
      loadingPercentage: {
        type: Number,
        default: 0,
      },
      manifestRecords: [
        {
          _id: mongoose.Schema.Types.ObjectId,
          manifestNumber: String,
          cargoType: String,
          totalWeight: Number,
          loadedWeight: Number,
          status: {
            type: String,
            enum: ["PENDING", "PARTIALLY_LOADED", "FULLY_LOADED"],
          },
          loadedAt: Date,
        },
      ],
    },

    // Vehicle Manifest Summary
    vehicleManifest: {
      totalVehicles: {
        type: Number,
        default: 0,
      },
      totalBoarded: {
        type: Number,
        default: 0,
      },
      totalNoShow: {
        type: Number,
        default: 0,
      },
      manifestRecords: [
        {
          _id: mongoose.Schema.Types.ObjectId,
          registration: String,
          vehicleType: String,
          boardingTicketNo: String,
          parkingSlot: String,
          status: {
            type: String,
            enum: ["BOARDED", "NO_SHOW"],
          },
          weight: Number,
          boardedAt: Date,
        },
      ],
    },

    // Trip Finalization
    finalization: {
      verificationStatus: {
        type: String,
        enum: ["Pending", "Verified", "Failed"],
        default: "Pending",
      },
      verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      verifiedAt: Date,
      verificationNotes: String,

      completionStatus: {
        type: String,
        enum: ["Pending", "Completed"],
        default: "Pending",
      },
      completedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      completedAt: Date,
      completionNotes: String,
    },

    // Discrepancies (if any)
    discrepancies: [
      {
        _id: mongoose.Schema.Types.ObjectId,
        type: {
          type: String,
          enum: ["Passenger", "Cargo", "Vehicle", "Weight", "Other"],
        },
        description: String,
        severity: {
          type: String,
          enum: ["Low", "Medium", "High"],
        },
        resolvedAt: Date,
        resolution: String,
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Audit Trail
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
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

// Indexes for performance
tripReportSchema.index({ company: 1, trip: 1 }, { unique: true })
tripReportSchema.index({ company: 1, reportStatus: 1 })
tripReportSchema.index({ company: 1, "finalization.completedAt": -1 })
tripReportSchema.index({ trip: 1, reportStatus: 1 })

module.exports = mongoose.model("TripReport", tripReportSchema)
