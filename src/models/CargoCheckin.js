const mongoose = require("mongoose")

const cargoCheckinSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    // Reference to booking
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CargoBooking",
      required: true,
    },
    trip: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trip",
      required: true,
      index: true,
    },

    // Check-in Status
    checkInStatus: {
      type: String,
      enum: ["Pending", "DocumentScanned", "VerificationComplete", "ManifestComplete", "CheckInComplete"],
      default: "Pending",
      index: true,
    },

    // Document Verification
    documentScanData: {
      documentNumber: String,
      documentType: {
        type: String,
        enum: ["BillOfLading", "AWB", "Barcode", "ManualEntry"],
      },
      scannedAt: Date,
      scannedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    },

    // Cargo Details
    cargo: {
      cargoType: String,
      description: String,
      totalQuantity: Number,
      totalWeight: Number,
      totalDimensions: {
        length: Number,
        width: Number,
        height: Number,
      },
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

    // Manifest Items
    manifestItems: [
      {
        _id: mongoose.Schema.Types.ObjectId,
        itemNo: Number,
        description: String,
        quantity: Number,
        weight: Number,
        dimensions: {
          length: Number,
          width: Number,
          height: Number,
        },
        markingNo: String,
        status: {
          type: String,
          enum: ["Added", "Verified", "Loaded"],
          default: "Added",
        },
        addedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Trip & Booking Details (cached)
    tripDetails: {
      vessel: String,
      voyageNo: String,
      from: String,
      to: String,
      etd: Date,
      eta: Date,
    },

    // Check-in Timeline
    checkInStartedAt: Date,
    documentVerifiedAt: Date,
    manifestCompletedAt: Date,
    checkInCompletedAt: Date,

    // Audit
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    checkedInBy: {
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

cargoCheckinSchema.index({ company: 1, trip: 1, checkInStatus: 1 })
cargoCheckinSchema.index({ company: 1, booking: 1 }, { unique: true })
cargoCheckinSchema.index({ company: 1, createdAt: -1 })
cargoCheckinSchema.index({ company: 1, isDeleted: 1 })

module.exports = mongoose.model("CargoCheckin", cargoCheckinSchema)
