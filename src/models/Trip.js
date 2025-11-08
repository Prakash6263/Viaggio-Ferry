const mongoose = require("mongoose")

const tripSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    // Trip Details
    tripName: {
      type: String,
      required: true,
      trim: true,
    },
    tripCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    vessel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ship",
      required: true,
    },
    departurePort: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Port",
      required: true,
    },
    arrivalPort: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Port",
      required: true,
    },
    departureDateTime: {
      type: Date,
      required: true,
    },
    arrivalDateTime: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["Scheduled", "In Progress", "Completed", "Cancelled"],
      default: "Scheduled",
    },

    // Booking Windows
    bookingOpeningDate: Date,
    bookingClosingDate: Date,
    checkInOpeningDate: Date,
    checkInClosingDate: Date,
    boardingClosingDate: Date,

    // Promotion & Notes
    promotion: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Promotion",
      default: null,
    },
    remarks: String,

    // Availability Management
    availability: [
      {
        _id: mongoose.Schema.Types.ObjectId,
        type: {
          type: String,
          enum: ["Passenger", "Cargo", "Vehicle"],
          required: true,
        },
        category: String,
        totalQuantity: {
          type: Number,
          required: true,
          min: 0,
        },
        allocations: [
          {
            _id: mongoose.Schema.Types.ObjectId,
            agent: {
              type: mongoose.Schema.Types.ObjectId,
              ref: "Agent",
              required: true,
            },
            allocatedQuantity: {
              type: Number,
              required: true,
              min: 0,
            },
            bookedQuantity: {
              type: Number,
              default: 0,
              min: 0,
            },
            createdAt: {
              type: Date,
              default: Date.now,
            },
          },
        ],
      },
    ],

    // Trip Ticketing Rules
    ticketingRules: [
      {
        _id: mongoose.Schema.Types.ObjectId,
        ruleType: String,
        ruleValue: String,
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Trip Reporting and Completion Tracking
    reportingStatus: {
      type: String,
      enum: ["NotStarted", "InProgress", "Verified", "Completed"],
      default: "NotStarted",
    },
    tripReport: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TripReport",
      default: null,
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
)

tripSchema.index({ company: 1, tripCode: 1 }, { unique: true })
tripSchema.index({ company: 1, vessel: 1 })
tripSchema.index({ company: 1, departurePort: 1, arrivalPort: 1 })
tripSchema.index({ company: 1, departureDateTime: 1 })
tripSchema.index({ company: 1, status: 1 })
tripSchema.index({ company: 1, isDeleted: 1 })

module.exports = mongoose.model("Trip", tripSchema)
