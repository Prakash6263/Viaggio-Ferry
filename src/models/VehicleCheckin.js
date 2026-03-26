const mongoose = require("mongoose")

const vehicleCheckinSchema = new mongoose.Schema(
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
      ref: "VehicleBooking",
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
      enum: ["Pending", "DocumentScanned", "VerificationComplete", "CheckInComplete"],
      default: "Pending",
      index: true,
    },

    // Document Verification
    documentScanData: {
      documentNumber: String,
      documentType: {
        type: String,
        enum: ["RegistrationCertificate", "Barcode", "ManualEntry"],
      },
      scannedAt: Date,
      scannedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    },

    // Vehicle Details
    vehicle: {
      vehicleType: String,
      registrationNumber: {
        type: String,
        trim: true,
        index: true,
      },
      make: String,
      model: String,
      year: Number,
      color: String,
      vin: String,
      owner: {
        name: String,
        nationalID: String,
        contact: String,
      },
      dimensions: {
        length: Number,
        width: Number,
        height: Number,
      },
      weight: Number,
    },

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

vehicleCheckinSchema.index({ company: 1, trip: 1, checkInStatus: 1 })
vehicleCheckinSchema.index({ company: 1, booking: 1 }, { unique: true })
vehicleCheckinSchema.index({ company: 1, "vehicle.registrationNumber": 1 })
vehicleCheckinSchema.index({ company: 1, createdAt: -1 })
vehicleCheckinSchema.index({ company: 1, isDeleted: 1 })

module.exports = mongoose.model("VehicleCheckin", vehicleCheckinSchema)
