const mongoose = require("mongoose")

const passengerBookingSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    // Booking Header
    bookingReference: {
      type: String,
      unique: true,
      uppercase: true,
      required: true,
      index: true,
    },
    bookingType: {
      type: String,
      enum: ["OneWay", "Return"],
      default: "OneWay",
      required: true,
    },
    bookingStatus: {
      type: String,
      enum: ["Pending", "Confirmed", "CheckedIn", "Boarded", "Cancelled", "Completed"],
      default: "Pending",
      index: true,
    },

    // Trip Information
    outboundTrip: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trip",
      required: true,
    },
    returnTrip: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trip",
      default: null,
    },

    // Ports
    originPort: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Port",
      required: true,
    },
    destinationPort: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Port",
      required: true,
    },

    // Dates
    departureDate: {
      type: Date,
      required: true,
    },
    returnDate: {
      type: Date,
      default: null,
    },

    // Passenger Details
    cabin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Cabin",
      required: true,
    },
    visaType: {
      type: String,
      enum: ["Temporary", "Business", "Transit", "Custom"],
      required: true,
    },

    // Passengers (array of passenger info)
    passengers: [
      {
        _id: mongoose.Schema.Types.ObjectId,
        passengerName: {
          type: String,
          required: true,
          trim: true,
        },
        passengerType: {
          type: String,
          enum: ["Adult", "Child", "Infant"],
          required: true,
        },
        nationality: {
          type: String,
          trim: true,
        },
        visaDetails: {
          type: String,
          default: "",
        },
        contactNumber: {
          type: String,
          trim: true,
        },
        email: {
          type: String,
          trim: true,
          lowercase: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Passenger Count Summary
    adultsCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    childrenCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    infantsCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Pricing & Payment
    baseFare: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    taxes: {
      type: Number,
      default: 0,
      min: 0,
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalFare: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    currency: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Currency",
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ["Pending", "Partial", "Paid", "Failed"],
      default: "Pending",
    },
    paymentMethod: {
      type: String,
      enum: ["Cash", "Card", "Bank Transfer", "Check"],
      default: null,
    },

    // Booking Agent/Source
    bookingAgent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Partner",
      default: null,
    },
    b2cCustomer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "B2CCustomer",
      default: null,
    },
    bookingSource: {
      type: String,
      enum: ["Agent", "B2C", "Internal", "Partner"],
      required: true,
    },

    // Special Requirements
    specialRequirements: {
      type: String,
      default: "",
      maxlength: 2000,
    },
    remarks: {
      type: String,
      default: "",
      maxlength: 2000,
    },

    // Audit
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    checkInDateTime: Date,
    boardingDateTime: Date,
    completedDateTime: Date,
    cancelledDateTime: Date,
    cancellationReason: String,

    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true },
)

// Indexes for efficient querying
passengerBookingSchema.index({ company: 1, bookingReference: 1 }, { unique: true })
passengerBookingSchema.index({ company: 1, bookingStatus: 1 })
passengerBookingSchema.index({ company: 1, departureDate: 1 })
passengerBookingSchema.index({ company: 1, outboundTrip: 1 })
passengerBookingSchema.index({ company: 1, bookingAgent: 1 })
passengerBookingSchema.index({ company: 1, b2cCustomer: 1 })
passengerBookingSchema.index({ company: 1, visaType: 1 })
passengerBookingSchema.index({ company: 1, createdAt: -1 })
passengerBookingSchema.index({ company: 1, "passengers.email": 1 })
passengerBookingSchema.index({ company: 1, isDeleted: 1 })

module.exports = mongoose.model("PassengerBooking", passengerBookingSchema)
