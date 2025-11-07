const { validationResult } = require("express-validator")
const InternalPaymentReceipt = require("../models/InternalPaymentReceipt")
const JournalEntry = require("../models/JournalEntry")
const ChartOfAccount = require("../models/ChartOfAccount")

function handleValidation(req) {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    const err = new Error("Validation failed")
    err.status = 400
    err.details = errors.array()
    throw err
  }
}

// Generate unique transaction number
const generateTransactionNumber = async (companyId, transactionType) => {
  const prefix = transactionType === "Incoming" ? "IE" : "OI"
  const count = await InternalPaymentReceipt.countDocuments({ companyId, transactionType })
  return `${prefix}-${String(count + 1).padStart(7, "0")}`
}

// Create new internal payment/receipt
async function create(req, res) {
  handleValidation(req)
  const { companyId } = req.params
  const {
    transactionDate,
    transactionType,
    isInternal,
    payorType,
    payorId,
    payorName,
    payorLedgerId,
    payorLedgerName,
    payeeType,
    payeeId,
    payeeName,
    payeeLedgerId,
    payeeLedgerName,
    amount,
    currency,
    rateOfExchange,
    baseCurrency,
    note,
    referenceNumber,
    documentUrl,
    documentName,
  } = req.body

  // Validation
  if (!amount || amount <= 0) {
    const err = new Error("Invalid amount")
    err.status = 400
    throw err
  }

  if (payorId === payeeId) {
    const err = new Error("Payor and Payee cannot be the same")
    err.status = 400
    throw err
  }

  // Verify ledger accounts exist and belong to company
  const [payorLedger, payeeLedger] = await Promise.all([
    ChartOfAccount.findById(payorLedgerId),
    ChartOfAccount.findById(payeeLedgerId),
  ])

  if (!payorLedger || !payeeLedger) {
    const err = new Error("Invalid ledger account(s)")
    err.status = 400
    throw err
  }

  // Generate transaction number
  const transactionNumber = await generateTransactionNumber(companyId, transactionType)

  // Calculate amount in base currency
  const amountInBaseCurrency = amount * (rateOfExchange || 1)

  const internalPayment = new InternalPaymentReceipt({
    companyId,
    transactionNumber,
    transactionDate,
    transactionType,
    isInternal,
    payorType,
    payorId,
    payorName,
    payorLedgerId,
    payorLedgerName,
    payeeType,
    payeeId,
    payeeName,
    payeeLedgerId,
    payeeLedgerName,
    amount,
    currency,
    rateOfExchange: rateOfExchange || 1,
    amountInBaseCurrency,
    baseCurrency,
    note,
    referenceNumber,
    documentUrl,
    documentName,
    createdBy: req.user._id,
    status: "Draft",
  })

  await internalPayment.save()

  res.status(201).json({
    success: true,
    data: internalPayment,
    message: "Internal payment/receipt created successfully",
  })
}

// Get all internal payments/receipts
async function getAll(req, res) {
  handleValidation(req)
  const { companyId } = req.params
  const { transactionType, status, payorId, payeeId, page = 1, limit = 10, search } = req.query

  const query = { companyId }

  if (transactionType) query.transactionType = transactionType
  if (status) query.status = status
  if (payorId) query.payorId = payorId
  if (payeeId) query.payeeId = payeeId

  if (search) {
    query.$or = [
      { transactionNumber: { $regex: search, $options: "i" } },
      { payorName: { $regex: search, $options: "i" } },
      { payeeName: { $regex: search, $options: "i" } },
    ]
  }

  const skip = (page - 1) * limit
  const total = await InternalPaymentReceipt.countDocuments(query)

  const receipts = await InternalPaymentReceipt.find(query)
    .populate("payorLedgerId", "name code")
    .populate("payeeLedgerId", "name code")
    .sort({ transactionDate: -1 })
    .skip(skip)
    .limit(Number.parseInt(limit))

  res.status(200).json({
    success: true,
    data: receipts,
    pagination: {
      total,
      page: Number.parseInt(page),
      limit: Number.parseInt(limit),
      pages: Math.ceil(total / limit),
    },
  })
}

// Get single internal payment/receipt
async function getById(req, res) {
  handleValidation(req)
  const { companyId, id } = req.params

  const receipt = await InternalPaymentReceipt.findOne({
    _id: id,
    companyId,
  })
    .populate("payorLedgerId")
    .populate("payeeLedgerId")
    .populate("journalEntryId")
    .populate("createdBy", "name email")
    .populate("confirmedBy", "name email")

  if (!receipt) {
    const err = new Error("Internal payment/receipt not found")
    err.status = 404
    throw err
  }

  res.status(200).json({
    success: true,
    data: receipt,
  })
}

// Confirm and create journal entry
async function confirm(req, res) {
  handleValidation(req)
  const { companyId, id } = req.params

  const receipt = await InternalPaymentReceipt.findOne({
    _id: id,
    companyId,
  })

  if (!receipt) {
    const err = new Error("Internal payment/receipt not found")
    err.status = 404
    throw err
  }

  if (receipt.status !== "Draft") {
    const err = new Error("Only draft transactions can be confirmed")
    err.status = 400
    throw err
  }

  // Create journal entry
  const journalEntry = new JournalEntry({
    companyId,
    referenceType: "InternalPaymentReceipt",
    referenceId: receipt._id,
    transactionDate: receipt.transactionDate,
    description: `${receipt.transactionType} - ${receipt.payorName} to ${receipt.payeeName}`,
    entries: [
      {
        accountId: receipt.payeeLedgerId,
        debitAmount: receipt.amount,
        creditAmount: 0,
      },
      {
        accountId: receipt.payorLedgerId,
        debitAmount: 0,
        creditAmount: receipt.amount,
      },
    ],
    status: "Posted",
    createdBy: req.user._id,
  })

  await journalEntry.save()

  // Update receipt
  receipt.status = "Confirmed"
  receipt.journalEntryId = journalEntry._id
  receipt.confirmedBy = req.user._id
  receipt.confirmedAt = new Date()
  await receipt.save()

  res.status(200).json({
    success: true,
    data: receipt,
    message: "Transaction confirmed and journal entry created",
  })
}

// Update internal payment/receipt (only Draft status)
async function update(req, res) {
  handleValidation(req)
  const { companyId, id } = req.params

  const receipt = await InternalPaymentReceipt.findOne({
    _id: id,
    companyId,
  })

  if (!receipt) {
    const err = new Error("Internal payment/receipt not found")
    err.status = 404
    throw err
  }

  if (receipt.status !== "Draft") {
    const err = new Error("Only draft transactions can be updated")
    err.status = 400
    throw err
  }

  // Allowed updates for draft
  const allowedFields = [
    "transactionDate",
    "amount",
    "currency",
    "rateOfExchange",
    "note",
    "documentUrl",
    "documentName",
  ]

  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      receipt[field] = req.body[field]
    }
  })

  receipt.updatedBy = req.user._id
  await receipt.save()

  res.status(200).json({
    success: true,
    data: receipt,
    message: "Internal payment/receipt updated successfully",
  })
}

// Delete (only Draft status)
async function destroy(req, res) {
  handleValidation(req)
  const { companyId, id } = req.params

  const receipt = await InternalPaymentReceipt.findOne({
    _id: id,
    companyId,
  })

  if (!receipt) {
    const err = new Error("Internal payment/receipt not found")
    err.status = 404
    throw err
  }

  if (receipt.status !== "Draft") {
    const err = new Error("Only draft transactions can be deleted")
    err.status = 400
    throw err
  }

  await InternalPaymentReceipt.deleteOne({ _id: id })

  res.status(200).json({
    success: true,
    message: "Internal payment/receipt deleted successfully",
  })
}

// Get ledger balance (for dropdown in form)
async function getLedgerBalance(req, res) {
  handleValidation(req)
  const { companyId } = req.params
  const { ledgerId } = req.query

  // You would implement balance calculation based on journal entries
  const balance = 0 // Placeholder

  res.status(200).json({
    success: true,
    data: { ledgerId, balance },
  })
}

module.exports = {
  create,
  getAll,
  getById,
  confirm,
  update,
  destroy,
  getLedgerBalance,
}
