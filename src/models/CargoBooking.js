const mongoose = require("mongoose")

const cargoBookingSchema = new mongoose.Schema(
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
      enum: ["Pending", "Confirmed", "Loaded", "InTransit", "Delivered", "Cancelled", "Completed"],
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

    // Cargo Details
    cargoType: {
      type: String,
      enum: ["General", "Container", "Hazmat", "Perishable", "Breakable", "Custom"],
      required: true,
    },
    visaType: {
      type: String,
      enum: ["Temporary", "Business", "Transit", "Custom"],
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    quantityUnit: {
      type: String,
      enum: ["Units", "Kilograms", "Tons", "Cubic Meters", "Containers"],
      required: true,
    },
    weight: {
      type: Number,
      default: 0,
      min: 0,
    },
    weightUnit: {
      type: String,
      enum: ["kg", "tons"],
      default: "kg",
    },
    dimensions: {
      length: Number,
      width: Number,
      height: Number,
      unit: {
        type: String,
        enum: ["cm", "m"],
        default: "m",
      },
    },
    description: {
      type: String,
      required: true,
      maxlength: 1000,
    },

    // Shipper/Receiver
    shipperId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Partner",
      default: null,
    },
    shipperName: {
      type: String,
      trim: true,
    },
    shipperContactNumber: String,

    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Partner",
      default: null,
    },
    receiverName: {
      type: String,
      trim: true,
    },
    receiverContactNumber: String,

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

    // Special Handling
    specialHandling: String,
    insuranceRequired: {
      type: Boolean,
      default: false,
    },
    insuranceAmount: {
      type: Number,
      default: 0,
    },
    remarks: String,

    // Audit
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    loadedDateTime: Date,
    deliveredDateTime: Date,

    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true },
)

cargoBookingSchema.index({ company: 1, bookingReference: 1 }, { unique: true })
cargoBookingSchema.index({ company: 1, bookingStatus: 1 })
cargoBookingSchema.index({ company: 1, departureDate: 1 })
cargoBookingSchema.index({ company: 1, outboundTrip: 1 })
cargoBookingSchema.index({ company: 1, cargoType: 1 })
cargoBookingSchema.index({ company: 1, createdAt: -1 })
cargoBookingSchema.index({ company: 1, isDeleted: 1 })

module.exports = mongoose.model("CargoBooking", cargoBookingSchema)
