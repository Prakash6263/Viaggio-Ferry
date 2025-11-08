const mongoose = require("mongoose")

const vehicleBoardingSchema = new mongoose.Schema(
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
      ref: "VehicleCheckin",
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
      ref: "VehicleBooking",
      required: true,
    },

    // Boarding Reference
    boardingTicketNumber: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    parkingSlot: {
      type: String,
      required: true,
      trim: true,
    },

    // Boarding Status
    boardingStatus: {
      type: String,
      enum: ["Pending", "Verified", "Boarded", "NoShow"],
      default: "Pending",
      index: true,
    },
    boardedAt: Date,
    boardedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // Vehicle Information (denormalized from booking)
    vehicle: {
      registration: String,
      type: String,
      make: String,
      model: String,
      color: String,
      owner: {
        name: String,
        contact: String,
        nationality: String,
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

    // Boarding Pass Data
    boardingPassData: {
      qrCode: String,
      barcode: String,
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

vehicleBoardingSchema.index({ company: 1, trip: 1, boardingStatus: 1 })
vehicleBoardingSchema.index({ company: 1, boardingTicketNumber: 1 }, { unique: true })
vehicleBoardingSchema.index({ company: 1, checkin: 1 }, { unique: true })
vehicleBoardingSchema.index({ company: 1, parkingSlot: 1, trip: 1 })
vehicleBoardingSchema.index({ company: 1, boardedAt: -1 })

module.exports = mongoose.model("VehicleBoarding", vehicleBoardingSchema)
