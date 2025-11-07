const { asyncHandler } = require("../middleware/errorHandler")
const { TrialBalance } = require("../models/TrialBalance")
const { GeneralLedger } = require("../models/GeneralLedger")
const { ChartOfAccount } = require("../models/ChartOfAccount")
const mongoose = require("mongoose")

// Get Trial Balance with advanced filtering
exports.getTrialBalance = asyncHandler(async (req, res) => {
  const { companyId } = req.params
  const {
    searchTerm,
    accountType,
    balanceStatus,
    dateFilter,
    startDate,
    endDate,
    asOfDate,
    page = 1,
    limit = 50,
  } = req.query

  const filters = {
    company: companyId,
    isDeleted: false,
  }

  // Account type filter
  if (accountType && accountType !== "All Types") {
    filters.ledgerType = accountType
  }

  // Balance status filter
  if (balanceStatus && balanceStatus !== "All Balances") {
    filters.balanceStatus = balanceStatus
  }

  // Date range filter
  if (asOfDate) {
    filters.asOfDate = new Date(asOfDate)
  } else if (startDate || endDate) {
    filters.asOfDate = {}
    if (startDate) filters.asOfDate.$gte = new Date(startDate)
    if (endDate) {
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      filters.asOfDate.$lte = end
    }
  }

  // Text search (code or description)
  if (searchTerm) {
    filters.$or = [
      { ledgerCodeText: { $regex: searchTerm, $options: "i" } },
      { ledgerDescription: { $regex: searchTerm, $options: "i" } },
    ]
  }

  const skip = (page - 1) * limit
  const total = await TrialBalance.countDocuments(filters)
  const trialBalanceData = await TrialBalance.find(filters)
    .populate("ledgerCode", "ledgerCode ledgerDescription ledgerType")
    .sort({ ledgerCodeText: 1 })
    .skip(skip)
    .limit(Number.parseInt(limit))
    .lean()

  res.json({
    success: true,
    total,
    page: Number.parseInt(page),
    limit: Number.parseInt(limit),
    data: trialBalanceData,
  })
})

// Get Trial Balance summary (totals only)
exports.getTrialBalanceSummary = asyncHandler(async (req, res) => {
  const { companyId } = req.params
  const { asOfDate } = req.query

  const matchStage = {
    company: mongoose.Types.ObjectId(companyId),
    isDeleted: false,
  }

  if (asOfDate) {
    matchStage.asOfDate = new Date(asOfDate)
  }

  const summary = await TrialBalance.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalDebit: { $sum: "$debit" },
        totalCredit: { $sum: "$credit" },
        accountCount: { $sum: 1 },
        totalEndBalance: { $sum: "$endBalance" },
      },
    },
    {
      $project: {
        _id: 0,
        totalDebit: 1,
        totalCredit: 1,
        accountCount: 1,
        totalEndBalance: 1,
        difference: { $subtract: ["$totalDebit", "$totalCredit"] },
        isBalanced: {
          $cond: [{ $eq: ["$totalDebit", "$totalCredit"] }, true, false],
        },
      },
    },
  ])

  res.json({
    success: true,
    data: summary[0] || {
      totalDebit: 0,
      totalCredit: 0,
      accountCount: 0,
      totalEndBalance: 0,
      difference: 0,
      isBalanced: true,
    },
  })
})

// Refresh Trial Balance (generate from General Ledger)
exports.refreshTrialBalance = asyncHandler(async (req, res) => {
  const { companyId } = req.params
  const { asOfDate } = req.body

  if (!asOfDate) {
    return res.status(400).json({
      success: false,
      message: "asOfDate is required",
    })
  }

  const dateAsOf = new Date(asOfDate)
  dateAsOf.setHours(23, 59, 59, 999)

  // Get all chart of accounts for the company
  const accounts = await ChartOfAccount.find({
    company: companyId,
    status: "Active",
    isDeleted: false,
  }).lean()

  // Calculate balances for each account
  const trialBalanceData = []

  for (const account of accounts) {
    const matchStage = {
      company: mongoose.Types.ObjectId(companyId),
      ledgerCode: account._id,
      isDeleted: false,
      posted: true,
      journalDate: { $lte: dateAsOf },
    }

    const ledgerEntries = await GeneralLedger.find(matchStage).lean()

    const totalDebit = ledgerEntries.reduce((sum, entry) => sum + (entry.debit || 0), 0)
    const totalCredit = ledgerEntries.reduce((sum, entry) => sum + (entry.credit || 0), 0)
    const endBalance = totalDebit - totalCredit

    let balanceStatus = "Balanced"
    if (endBalance > 0) {
      balanceStatus = "Debit"
    } else if (endBalance < 0) {
      balanceStatus = "Credit"
    }

    trialBalanceData.push({
      company: companyId,
      ledgerCode: account._id,
      ledgerCodeText: account.ledgerCode,
      ledgerDescription: account.ledgerDescription,
      ledgerType: account.ledgerType,
      initialBalance: 0, // Can be enhanced with opening balance logic
      debit: totalDebit,
      credit: totalCredit,
      endBalance,
      balanceStatus,
      asOfDate: dateAsOf,
      startDate: new Date(`${dateAsOf.getFullYear()}-01-01`),
      endDate: dateAsOf,
      createdBy: req.user._id,
      lastRefreshed: new Date(),
    })
  }

  // Delete existing trial balance for this company and date
  await TrialBalance.deleteMany({
    company: companyId,
    asOfDate: dateAsOf,
  })

  // Insert new trial balance data
  const createdTrialBalance = await TrialBalance.insertMany(trialBalanceData)

  res.json({
    success: true,
    message: `Trial Balance refreshed successfully with ${createdTrialBalance.length} accounts`,
    data: createdTrialBalance,
  })
})

// Export Trial Balance to CSV
exports.exportTrialBalance = asyncHandler(async (req, res) => {
  const { companyId } = req.params
  const { asOfDate, accountType, balanceStatus } = req.query

  const filters = {
    company: companyId,
    isDeleted: false,
  }

  if (asOfDate) {
    filters.asOfDate = new Date(asOfDate)
  }

  if (accountType && accountType !== "All Types") {
    filters.ledgerType = accountType
  }

  if (balanceStatus && balanceStatus !== "All Balances") {
    filters.balanceStatus = balanceStatus
  }

  const trialBalanceData = await TrialBalance.find(filters).sort({ ledgerCodeText: 1 }).lean()

  // Calculate totals
  const totalDebit = trialBalanceData.reduce((sum, acc) => sum + (acc.debit || 0), 0)
  const totalCredit = trialBalanceData.reduce((sum, acc) => sum + (acc.credit || 0), 0)

  // CSV formatting
  let csvContent =
    "Account Code,Account Description,Account Type,Initial Balance,Debit,Credit,End Balance,Balance Status\n"

  trialBalanceData.forEach((entry) => {
    csvContent += `"${entry.ledgerCodeText}","${entry.ledgerDescription}","${
      entry.ledgerType
    }","${entry.initialBalance}","${entry.debit}","${entry.credit}","${entry.endBalance}","${entry.balanceStatus}"\n`
  })

  // Add totals row
  csvContent += `"TOTAL","","","","${totalDebit}","${totalCredit}","${totalDebit - totalCredit}",""\n`

  res.setHeader("Content-Type", "text/csv; charset=utf-8")
  res.setHeader("Content-Disposition", "attachment; filename=trial-balance.csv")
  res.send(csvContent)
})

// Get Trial Balance by account type
exports.getTrialBalanceByType = asyncHandler(async (req, res) => {
  const { companyId } = req.params
  const { accountType, asOfDate } = req.query

  const matchStage = {
    company: mongoose.Types.ObjectId(companyId),
    isDeleted: false,
  }

  if (accountType) {
    matchStage.ledgerType = accountType
  }

  if (asOfDate) {
    matchStage.asOfDate = new Date(asOfDate)
  }

  const typeGrouped = await TrialBalance.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: "$ledgerType",
        totalDebit: { $sum: "$debit" },
        totalCredit: { $sum: "$credit" },
        totalEndBalance: { $sum: "$endBalance" },
        accountCount: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ])

  res.json({
    success: true,
    data: typeGrouped,
  })
})

// Get distinct account types for filter dropdown
exports.getAccountTypes = asyncHandler(async (req, res) => {
  const { companyId } = req.params

  const accountTypes = await ChartOfAccount.distinct("ledgerType", {
    company: companyId,
    status: "Active",
    isDeleted: false,
  })

  res.json({
    success: true,
    data: accountTypes.sort(),
  })
})
