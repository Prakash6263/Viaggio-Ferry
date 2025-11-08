const mongoose = require("mongoose")

const vehicleBookingSchema = new mongoose.Schema(
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
      enum: ["Pending", "Confirmed", "CheckedIn", "Loaded", "Cancelled", "Completed"],
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

    // Vehicle Details
    vehicleType: {
      type: String,
      enum: ["Sedan", "SUV", "Truck", "Bus", "Motorcycle", "Van", "Other"],
      required: true,
    },
    visaType: {
      type: String,
      enum: ["Temporary", "Business", "Transit", "Custom"],
      required: true,
    },
    vehicleRegistration: {
      type: String,
      trim: true,
      required: true,
    },
    vehicleModel: String,
    vehicleColor: String,

    // Vehicle Owner
    ownerName: {
      type: String,
      required: true,
      trim: true,
    },
    ownerContactNumber: String,
    ownerEmail: String,

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

    // Booking Agent/Source
    bookingAgent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Agent",
      default: null,
    },
    bookingSource: {
      type: String,
      enum: ["Agent", "Internal", "Partner"],
      required: true,
    },

    // Remarks
    specialRequirements: String,
    remarks: String,

    // Audit
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    checkInDateTime: Date,
    loadedDateTime: Date,
    completedDateTime: Date,

    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true },
)

vehicleBookingSchema.index({ company: 1, bookingReference: 1 }, { unique: true })
vehicleBookingSchema.index({ company: 1, bookingStatus: 1 })
vehicleBookingSchema.index({ company: 1, departureDate: 1 })
vehicleBookingSchema.index({ company: 1, outboundTrip: 1 })
vehicleBookingSchema.index({ company: 1, vehicleType: 1 })
vehicleBookingSchema.index({ company: 1, createdAt: -1 })
vehicleBookingSchema.index({ company: 1, isDeleted: 1 })

module.exports = mongoose.model("VehicleBooking", vehicleBookingSchema)
