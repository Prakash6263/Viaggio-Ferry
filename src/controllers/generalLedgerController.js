const { asyncHandler } = require("../middleware/errorHandler")
const { GeneralLedger } = require("../models/GeneralLedger")
const { JournalEntry } = require("../models/JournalEntry")
const { ChartOfAccount } = require("../models/ChartOfAccount")
const mongoose = require("mongoose") // Declare mongoose variable

// Get General Ledger with filters
exports.getGeneralLedger = asyncHandler(async (req, res) => {
  const {
    ledgerCode,
    searchTerm,
    startDate,
    endDate,
    layer,
    partner,
    postedOnly = false,
    page = 1,
    limit = 50,
  } = req.query

  const { companyId } = req.params

  const filters = {
    company: companyId,
    isDeleted: false,
  }

  if (postedOnly === "true") {
    filters.posted = true
  }

  if (ledgerCode) {
    filters.ledgerCodeText = ledgerCode
  }

  if (layer) {
    filters.layer = layer
  }

  if (partner) {
    filters.partner = partner
  }

  if (startDate || endDate) {
    filters.journalDate = {}
    if (startDate) filters.journalDate.$gte = new Date(startDate)
    if (endDate) {
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      filters.journalDate.$lte = end
    }
  }

  if (searchTerm) {
    filters.$text = { $search: searchTerm }
  }

  const skip = (page - 1) * limit
  const total = await GeneralLedger.countDocuments(filters)
  const entries = await GeneralLedger.find(filters)
    .populate("ledgerCode", "ledgerCode ledgerDescription")
    .populate("partner", "name")
    .populate("currency", "code")
    .sort({ journalDate: -1, _id: -1 })
    .skip(skip)
    .limit(Number.parseInt(limit))
    .lean()

  res.json({
    success: true,
    total,
    page: Number.parseInt(page),
    limit: Number.parseInt(limit),
    data: entries,
  })
})

// Get ledger details for a specific account
exports.getAccountLedger = asyncHandler(async (req, res) => {
  const { companyId, ledgerId } = req.params
  const { startDate, endDate, page = 1, limit = 100 } = req.query

  const filters = {
    company: companyId,
    ledgerCode: ledgerId,
    isDeleted: false,
  }

  if (startDate || endDate) {
    filters.journalDate = {}
    if (startDate) filters.journalDate.$gte = new Date(startDate)
    if (endDate) {
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      filters.journalDate.$lte = end
    }
  }

  const skip = (page - 1) * limit
  const total = await GeneralLedger.countDocuments(filters)
  const entries = await GeneralLedger.find(filters)
    .populate("ledgerCode", "ledgerCode ledgerDescription")
    .populate("partner", "name")
    .populate("currency", "code")
    .populate("journalEntry", "journalNo")
    .sort({ journalDate: 1, _id: 1 })
    .skip(skip)
    .limit(Number.parseInt(limit))
    .lean()

  // Calculate running balance
  let runningBalance = 0
  const enrichedEntries = entries.map((entry) => {
    runningBalance += (entry.debit || 0) - (entry.credit || 0)
    return { ...entry, balance: runningBalance }
  })

  res.json({
    success: true,
    total,
    page: Number.parseInt(page),
    limit: Number.parseInt(limit),
    data: enrichedEntries,
  })
})

// Get trial balance
exports.getTrialBalance = asyncHandler(async (req, res) => {
  const { companyId } = req.params
  const { startDate, endDate, layer } = req.query

  const matchStage = {
    company: mongoose.Types.ObjectId(companyId),
    isDeleted: false,
    posted: true,
  }

  if (layer) {
    matchStage.layer = layer
  }

  if (startDate || endDate) {
    matchStage.journalDate = {}
    if (startDate) matchStage.journalDate.$gte = new Date(startDate)
    if (endDate) {
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      matchStage.journalDate.$lte = end
    }
  }

  const trialBalance = await GeneralLedger.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: "$ledgerCode",
        ledgerCodeText: { $first: "$ledgerCodeText" },
        ledgerDescription: { $first: "$ledgerDescription" },
        totalDebit: { $sum: "$debit" },
        totalCredit: { $sum: "$credit" },
      },
    },
    {
      $project: {
        _id: 0,
        ledgerCode: "$ledgerCodeText",
        ledgerDescription: "$ledgerDescription",
        debit: "$totalDebit",
        credit: "$totalCredit",
        balance: { $subtract: ["$totalDebit", "$totalCredit"] },
      },
    },
    { $sort: { ledgerCode: 1 } },
  ])

  const totalDebit = trialBalance.reduce((sum, acc) => sum + (acc.debit || 0), 0)
  const totalCredit = trialBalance.reduce((sum, acc) => sum + (acc.credit || 0), 0)

  res.json({
    success: true,
    data: trialBalance,
    totals: {
      debit: totalDebit,
      credit: totalCredit,
      difference: totalDebit - totalCredit,
    },
  })
})

// Export to CSV
exports.exportLedger = asyncHandler(async (req, res) => {
  const { companyId } = req.params
  const { ledgerCode, startDate, endDate, layer } = req.query

  const filters = {
    company: companyId,
    isDeleted: false,
    posted: true,
  }

  if (ledgerCode) {
    filters.ledgerCodeText = ledgerCode
  }

  if (layer) {
    filters.layer = layer
  }

  if (startDate || endDate) {
    filters.journalDate = {}
    if (startDate) filters.journalDate.$gte = new Date(startDate)
    if (endDate) {
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      filters.journalDate.$lte = end
    }
  }

  const entries = await GeneralLedger.find(filters)
    .populate("ledgerCode", "ledgerCode ledgerDescription")
    .populate("partner", "name")
    .populate("currency", "code")
    .sort({ journalDate: 1 })
    .lean()

  // CSV formatting
  let csvContent =
    "Date,Journal No,Layer,Partner,Ledger Code,Ledger Description,Debit,Credit,Currency,Amount Currency,Rate,Doc Ref,Voyage No,Service Type,Note\n"

  entries.forEach((entry) => {
    csvContent += `"${entry.journalDate.toISOString().split("T")[0]}","${
      entry.journalNo
    }","${entry.layer}","${entry.partnerName}","${entry.ledgerCodeText}","${
      entry.ledgerDescription
    }","${entry.debit}","${entry.credit}","${entry.currencyCode}","${
      entry.amountInCurrency
    }","${entry.rate}","${entry.docReference}","${entry.voyageNo}","${entry.serviceType}","${entry.note}"\n`
  })

  res.setHeader("Content-Type", "text/csv")
  res.setHeader("Content-Disposition", "attachment; filename=general-ledger.csv")
  res.send(csvContent)
})

// Get General Ledger list with filters
exports.ledgerList = asyncHandler(async (req, res) => {
  const {
    ledgerCode,
    searchTerm,
    startDate,
    endDate,
    layer,
    partner,
    postedOnly = false,
    page = 1,
    limit = 50,
  } = req.query

  const { companyId } = req.params

  const filters = {
    company: companyId,
    isDeleted: false,
  }

  if (postedOnly === "true") {
    filters.posted = true
  }

  if (ledgerCode) {
    filters.ledgerCodeText = ledgerCode
  }

  if (layer) {
    filters.layer = layer
  }

  if (partner) {
    filters.partner = partner
  }

  if (startDate || endDate) {
    filters.journalDate = {}
    if (startDate) filters.journalDate.$gte = new Date(startDate)
    if (endDate) {
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      filters.journalDate.$lte = end
    }
  }

  if (searchTerm) {
    filters.$text = { $search: searchTerm }
  }

  const skip = (page - 1) * limit
  const total = await GeneralLedger.countDocuments(filters)
  const entries = await GeneralLedger.find(filters)
    .populate("ledgerCode", "ledgerCode ledgerDescription")
    .populate("partner", "name")
    .populate("currency", "code")
    .sort({ journalDate: -1, _id: -1 })
    .skip(skip)
    .limit(Number.parseInt(limit))
    .lean()

  res.json({
    success: true,
    total,
    page: Number.parseInt(page),
    limit: Number.parseInt(limit),
    data: entries,
  })
})
