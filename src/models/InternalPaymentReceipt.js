const mongoose = require("mongoose")

const internalPaymentReceiptSchema = new mongoose.Schema(
  {
    // Company context (multi-tenancy)
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    // Transaction Identifiers
    transactionNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
      // Format: IE-XXXXXXX (Incoming) or OI-XXXXXXX (Outgoing)
    },
    transactionDate: {
      type: Date,
      required: true,
      index: true,
    },

    // Transaction Type
    transactionType: {
      type: String,
      enum: ["Incoming", "Outgoing"],
      required: true,
      index: true,
    },
    isInternal: {
      type: Boolean,
      default: true,
      // Flag to distinguish internal vs external transactions
    },

    // Payor Information (who is paying)
    payorType: {
      type: String,
      enum: ["Partner", "Agent", "Company", "External"],
      required: true,
    },
    payorId: {
      type: mongoose.Schema.Types.ObjectId,
      // Can reference Partner, Agent, or Company based on payorType
      required: true,
      index: true,
    },
    payorName: {
      type: String,
      required: true,
    },
    payorLedgerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChartOfAccount",
      required: true,
    },
    payorLedgerName: {
      type: String,
      required: true,
    },

    // Payee Information (who is receiving payment)
    payeeType: {
      type: String,
      enum: ["Partner", "Agent", "Company", "Internal"],
      required: true,
    },
    payeeId: {
      type: mongoose.Schema.Types.ObjectId,
      // Can reference Partner, Agent, or Company based on payeeType
      required: true,
      index: true,
    },
    payeeName: {
      type: String,
      required: true,
    },
    payeeLedgerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChartOfAccount",
      required: true,
    },
    payeeLedgerName: {
      type: String,
      required: true,
    },

    // Amount Information
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      enum: ["USD", "EUR", "GBP", "SDG", "AED", "BHD", "KWD", "OMR", "QAR", "SAR", "AED"],
      required: true,
      default: "USD",
    },

    // Exchange Rate & Conversion
    rateOfExchange: {
      type: Number,
      required: true,
      default: 1,
      min: 0.0001,
      // ROE for currency conversion
    },
    amountInBaseCurrency: {
      type: Number,
      required: true,
      // Amount after ROE conversion (e.g., SDG amount if base currency is SDG)
    },
    baseCurrency: {
      type: String,
      required: true,
      default: "SDG",
      // Company's base currency
    },

    // Journal Entry Reference
    journalEntryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JournalEntry",
      // Reference to the accounting entry created
    },

    // Documentation
    documentUrl: {
      type: String,
      // Stored file path/URL from Vercel Blob or similar
    },
    documentName: {
      type: String,
    },

    // Notes & References
    note: {
      type: String,
      maxlength: 2000,
    },
    referenceNumber: {
      type: String,
      // External reference if applicable
    },

    // Status Tracking
    status: {
      type: String,
      enum: ["Draft", "Pending", "Confirmed", "Reconciled", "Cancelled"],
      default: "Draft",
      index: true,
    },
    confirmedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      // User who confirmed the entry
    },
    confirmedAt: {
      type: Date,
      // When was this confirmed
    },

    // Reconciliation
    reconcilationStatus: {
      type: String,
      enum: ["Unreconciled", "Partially Reconciled", "Fully Reconciled"],
      default: "Unreconciled",
    },
    reconcilationDate: {
      type: Date,
    },

    // Audit Trail
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
    collection: "internal_payment_receipts",
  },
)

// Index for common queries
internalPaymentReceiptSchema.index({ companyId: 1, transactionDate: -1 })
internalPaymentReceiptSchema.index({ companyId: 1, status: 1 })
internalPaymentReceiptSchema.index({ companyId: 1, payorId: 1 })
internalPaymentReceiptSchema.index({ companyId: 1, payeeId: 1 })
internalPaymentReceiptSchema.index({ transactionNumber: 1, companyId: 1 })

// Virtual for display
internalPaymentReceiptSchema.virtual("displayAmount").get(function () {
  return `${this.currency} ${this.amount.toFixed(2)}`
})

// Pre-save validation
internalPaymentReceiptSchema.pre("save", function (next) {
  // Auto-calculate amount in base currency if ROE provided
  if (this.rateOfExchange && this.amount) {
    this.amountInBaseCurrency = this.amount * this.rateOfExchange
  }

  // Ensure payor and payee are different
  if (this.payorId.toString() === this.payeeId.toString()) {
    return next(new Error("Payor and Payee cannot be the same"))
  }

  next()
})

module.exports = mongoose.model("InternalPaymentReceipt", internalPaymentReceiptSchema)
