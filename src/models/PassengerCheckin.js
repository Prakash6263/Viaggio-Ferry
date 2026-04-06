const mongoose = require("mongoose")

const passengerCheckinSchema = new mongoose.Schema(
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
      ref: "PassengerBooking",
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
      enum: ["Pending", "DocumentScanned", "VerificationComplete", "LuggageComplete", "CheckInComplete"],
      default: "Pending",
      index: true,
    },

    // Document Verification
    documentScanData: {
      documentNumber: {
        type: String,
        trim: true,
        index: true,
      },
      documentType: {
        type: String,
        enum: ["Passport", "NationalID", "Barcode", "ManualEntry"],
        default: "Passport",
      },
      scannedAt: Date,
      scannedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    },

    // Passenger Verification (from booking)
    passenger: {
      passengerName: String,
      nationality: String,
      passportNumber: String,
      expiryDate: Date,
      age: Number,
      gender: String,
      email: String,
      passengerType: {
        type: String,
        enum: ["Adult", "Child", "Infant"],
      },
      idPassportVerified: {
        type: Boolean,
        default: false,
      },
    },

    // Luggage Management
    luggage: [
      {
        _id: mongoose.Schema.Types.ObjectId,
        luggageLabel: {
          type: String,
          required: true,
          trim: true,
        },
        trolleyNo: String,
        allowedWeight: {
          type: Number,
          default: 0,
        },
        actualWeight: {
          type: Number,
          required: true,
        },
        excessWeight: {
          type: Number,
          default: 0,
        },
        status: {
          type: String,
          enum: ["Added", "Confirmed", "Loaded"],
          default: "Added",
        },
        addedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Total luggage summary
    totalAllowedWeight: {
      type: Number,
      default: 0,
    },
    totalActualWeight: {
      type: Number,
      default: 0,
    },
    totalExcessWeight: {
      type: Number,
      default: 0,
    },

    // Excess Luggage Ticket
    excessLuggageTicket: {
      ticketNumber: {
        type: String,
        unique: true,
        sparse: true,
        trim: true,
      },
      excessWeight: {
        type: Number,
        default: 0,
      },
      feePerKg: {
        type: Number,
        default: 0,
      },
      totalFee: {
        type: Number,
        default: 0,
      },
      currency: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Currency",
      },
      paymentMethod: {
        type: String,
        enum: ["Cash", "BankAccount", "Card"],
      },
      paymentStatus: {
        type: String,
        enum: ["Pending", "Paid", "Failed"],
        default: "Pending",
      },
      paymentConfirmedAt: Date,
      paymentConfirmedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      transactionNumber: String,
    },

    // Trip & Booking Details (cached for quick access)
    tripDetails: {
      vessel: String,
      voyageNo: String,
      from: String,
      to: String,
      etd: Date,
      eta: Date,
    },

    // Agent Details (cached)
    agentDetails: {
      company: String,
      marineAgent: String,
      commercialAgent: String,
      subagent: String,
      salesman: String,
    },

    // Ticket Details (cached)
    ticketDetails: {
      ticketNo: String,
      cabin: String,
      ticketType: String,
      serviceType: String,
      visaType: String,
      allowedWeight: Number,
      status: String,
    },

    // Check-in Timeline
    checkInStartedAt: Date,
    documentVerifiedAt: Date,
    luggageCompletedAt: Date,
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

passengerCheckinSchema.index({ company: 1, trip: 1, checkInStatus: 1 })
passengerCheckinSchema.index({ company: 1, booking: 1 }, { unique: true })
passengerCheckinSchema.index({ company: 1, "documentScanData.documentNumber": 1 })
passengerCheckinSchema.index({ company: 1, createdAt: -1 })
passengerCheckinSchema.index({ company: 1, isDeleted: 1 })

module.exports = mongoose.model("PassengerCheckin", passengerCheckinSchema)
