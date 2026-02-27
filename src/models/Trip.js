const mongoose = require("mongoose")

const TRIP_STATUS = ["SCHEDULED", "OPEN", "CLOSED", "COMPLETED", "CANCELLED"]

const CreatorSchema = new mongoose.Schema(
  {
    id: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    name: {
      type: String,
      default: "Unknown",
    },
    type: {
      type: String,
      enum: ["company", "user", "system"],
      default: "system",
    },
    layer: {
      type: String,
      default: undefined,
    },
  },
  { _id: false }
)

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
    ship: {
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
    // Trip Dates
    departureDateTime: {
      type: Date,
      required: true,
    },
    arrivalDateTime: {
      type: Date,
      required: true,
    },
    // Booking Windows
    bookingOpeningDate: Date,
    bookingClosingDate: Date,
    checkInOpeningDate: Date,
    checkInClosingDate: Date,
    boardingClosingDate: Date,
    // Status
    status: {
      type: String,
      enum: TRIP_STATUS,
      default: "SCHEDULED",
      index: true,
    },
    remarks: String,
    // Promotion & Notes
    promotion: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Promotion",
      default: null,
    },
    // Reporting Status
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
    // Audit
    createdBy: {
      type: CreatorSchema,
      default: () => ({
        id: null,
        name: "Unknown",
        type: "system",
        layer: undefined,
      }),
    },
    updatedBy: {
      type: CreatorSchema,
      default: null,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true },
)

tripSchema.index({ company: 1, tripCode: 1 }, { unique: true })
tripSchema.index({ company: 1, departureDateTime: 1 })
tripSchema.index({ company: 1, ship: 1 })
tripSchema.index({ company: 1, departurePort: 1, arrivalPort: 1 })
tripSchema.index({ company: 1, status: 1 })
tripSchema.index({ company: 1, isDeleted: 1 })

module.exports = {
  Trip: mongoose.model("Trip", tripSchema),
  TRIP_STATUS,
}
