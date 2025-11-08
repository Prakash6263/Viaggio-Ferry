const mongoose = require("mongoose")

const passengerBoardingSchema = new mongoose.Schema(
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
      ref: "PassengerCheckin",
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
      ref: "PassengerBooking",
      required: true,
    },

    // Boarding Pass Information
    boardingPassNumber: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    seatNumber: {
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

    // Passenger Information (denormalized from booking)
    passenger: {
      name: String,
      nationality: String,
      passportNo: String,
      expiryDate: Date,
      age: Number,
      gender: String,
      email: String,
      type: {
        type: String,
        enum: ["Adult", "Child", "Infant"],
      },
    },

    // Ticket Information (denormalized)
    ticket: {
      ticketNo: String,
      cabin: String,
      cabinType: String,
      ticketType: String,
      serviceType: String,
      visaType: String,
      allowedWeight: Number,
      status: String,
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

    // Luggage Summary
    luggage: {
      totalItems: Number,
      totalActualWeight: Number,
      totalExcessWeight: Number,
      excessFee: {
        amount: Number,
        currency: String,
        status: {
          type: String,
          enum: ["Pending", "Paid"],
        },
      },
    },

    // Boarding Pass Preview Data
    boardingPassData: {
      qrCode: String, // QR code data
      barcode: String, // Barcode data
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

passengerBoardingSchema.index({ company: 1, trip: 1, boardingStatus: 1 })
passengerBoardingSchema.index({ company: 1, boardingPassNumber: 1 }, { unique: true })
passengerBoardingSchema.index({ company: 1, seatNumber: 1, trip: 1 })
passengerBoardingSchema.index({ company: 1, checkin: 1 }, { unique: true })
passengerBoardingSchema.index({ company: 1, boardedAt: -1 })

module.exports = mongoose.model("PassengerBoarding", passengerBoardingSchema)
