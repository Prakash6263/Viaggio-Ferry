const mongoose = require("mongoose")

const JOURNAL_ENTRY_STATUS = ["Draft", "Posted", "Cancelled"]
const SERVICE_TYPES = ["Freight", "Port Charges", "Agency Fees", "Adjustment", "Other"]

const JournalEntrySchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    journalNo: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    journalDate: {
      type: Date,
      required: true,
      index: true,
    },
    layer: {
      type: String,
      enum: ["Primary", "Adjustment", "Reversing"],
      required: true,
      default: "Primary",
    },
    partner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Partner",
      default: null,
    },
    docReference: {
      type: String,
      trim: true,
      default: "",
    },
    voyageNo: {
      type: String,
      trim: true,
      default: "",
    },
    serviceType: {
      type: String,
      enum: SERVICE_TYPES,
      default: "Other",
    },
    journalLines: [
      {
        ledgerCode: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "ChartOfAccount",
          required: true,
        },
        ledgerDescription: {
          type: String,
          trim: true,
        },
        debit: {
          type: Number,
          default: 0,
          min: 0,
        },
        credit: {
          type: Number,
          default: 0,
          min: 0,
        },
        note: {
          type: String,
          trim: true,
          default: "",
        },
        currency: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Currency",
          required: true,
        },
        rate: {
          type: Number,
          default: 1,
          min: 0,
        },
      },
    ],
    totalDebit: {
      type: Number,
      default: 0,
    },
    totalCredit: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: JOURNAL_ENTRY_STATUS,
      default: "Draft",
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    postedDate: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      default: "",
      maxlength: 2000,
    },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
)

JournalEntrySchema.index({ company: 1, journalNo: 1 }, { unique: true })
JournalEntrySchema.index({ company: 1, journalDate: 1 })
JournalEntrySchema.index({ company: 1, status: 1 })
JournalEntrySchema.index({ company: 1, layer: 1 })

module.exports = {
  JournalEntry: mongoose.model("JournalEntry", JournalEntrySchema),
  JOURNAL_ENTRY_STATUS,
  SERVICE_TYPES,
}
