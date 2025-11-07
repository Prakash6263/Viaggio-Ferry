const createHttpError = require("http-errors")
const { GeneralLedger } = require("../models/GeneralLedger")
const { JournalEntry } = require("../models/JournalEntry")
const { ChartOfAccount } = require("../models/ChartOfAccount")

/**
 * Create General Ledger entries from a posted Journal Entry
 * This ensures the General Ledger stays in sync with Journal Entries
 */
async function createLedgerEntriesFromJournal(journalId, companyId) {
  const journal = await JournalEntry.findOne({ _id: journalId, company: companyId })
    .populate("journalLines.ledgerCode")
    .populate("journalLines.currency")
    .populate("partner")

  if (!journal) {
    throw new createHttpError.NotFound("Journal entry not found")
  }

  // Clear any existing ledger entries for this journal (in case of re-posting)
  await GeneralLedger.deleteMany({ journalEntry: journalId })

  // Create a ledger entry for each journal line
  const ledgerEntries = []
  for (const line of journal.journalLines) {
    const ledgerEntry = new GeneralLedger({
      company: companyId,
      journalEntry: journal._id,
      journalNo: journal.journalNo,
      journalDate: journal.journalDate,
      layer: journal.layer,
      partner: journal.partner?._id,
      ledgerCode: line.ledgerCode._id,
      ledgerDescription: line.ledgerCode.ledgerDescription,
      debit: line.debit || 0,
      credit: line.credit || 0,
      currency: line.currency._id,
      currencyCode: line.currency.code,
      amountCurrency: line.amountCurrency || line.debit || line.credit,
      rate: line.rate || 1,
      docReference: journal.docReference,
      voyageNo: journal.voyageNo,
      serviceType: journal.serviceType,
      note: line.narration || journal.notes,
      status: "Posted",
    })

    ledgerEntries.push(ledgerEntry)
  }

  // Bulk insert all ledger entries
  return await GeneralLedger.insertMany(ledgerEntries)
}

/**
 * Get General Ledger with filters and pagination
 */
async function getGeneralLedger({
  companyId,
  page = 1,
  limit = 10,
  q,
  startDate,
  endDate,
  layer,
  partner,
  sortBy = "journalDate",
  sortOrder = -1,
}) {
  const skip = (page - 1) * limit
  const filter = { company: companyId }

  if (q) {
    filter.$or = [
      { ledgerDescription: { $regex: q, $options: "i" } },
      { "ledgerCode.ledgerCode": { $regex: q, $options: "i" } },
      { journalNo: { $regex: q, $options: "i" } },
    ]
  }

  if (startDate || endDate) {
    filter.journalDate = {}
    if (startDate) filter.journalDate.$gte = new Date(startDate)
    if (endDate) filter.journalDate.$lte = new Date(endDate)
  }

  if (layer) filter.layer = layer
  if (partner) filter.partner = partner

  const total = await GeneralLedger.countDocuments(filter)
  const entries = await GeneralLedger.find(filter)
    .populate("journalEntry", "journalNo status")
    .populate("ledgerCode", "ledgerCode ledgerDescription")
    .populate("partner", "name")
    .populate("currency", "code symbol")
    .sort({ [sortBy]: sortOrder })
    .skip(skip)
    .limit(limit)

  // Calculate opening balance and add to response
  const openingBalance = await GeneralLedger.aggregate([
    { $match: { company: companyId, journalDate: { $lt: new Date(startDate || "1900-01-01") } } },
    { $group: { _id: null, totalDebit: { $sum: "$debit" }, totalCredit: { $sum: "$credit" } } },
  ])

  return {
    data: entries,
    openingBalance: openingBalance[0] || { totalDebit: 0, totalCredit: 0 },
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  }
}

/**
 * Get Account-specific Ledger with running balance
 */
async function getAccountLedger({ companyId, ledgerId, startDate, endDate, sortOrder = 1 }) {
  const filter = { company: companyId, ledgerCode: ledgerId }

  if (startDate || endDate) {
    filter.journalDate = {}
    if (startDate) filter.journalDate.$gte = new Date(startDate)
    if (endDate) filter.journalDate.$lte = new Date(endDate)
  }

  // Get opening balance before start date
  const openingResult = await GeneralLedger.aggregate([
    { $match: { company: companyId, ledgerCode: ledgerId, journalDate: { $lt: new Date(startDate || "1900-01-01") } } },
    { $group: { _id: null, totalDebit: { $sum: "$debit" }, totalCredit: { $sum: "$credit" } } },
  ])

  const opening = openingResult[0] || { totalDebit: 0, totalCredit: 0 }
  let runningBalance = opening.totalDebit - opening.totalCredit

  // Get ledger entries with calculated running balance
  const entries = await GeneralLedger.find(filter)
    .populate("ledgerCode", "ledgerCode ledgerDescription ledgerType")
    .populate("partner", "name")
    .populate("currency", "code symbol")
    .populate("journalEntry", "journalNo")
    .sort({ journalDate: sortOrder })

  // Add running balance to each entry
  const enrichedEntries = entries.map((entry) => {
    runningBalance += entry.debit - entry.credit
    return {
      ...entry.toObject(),
      runningBalance,
    }
  })

  return {
    accountInfo: await ChartOfAccount.findOne({ _id: ledgerId }),
    openingBalance: opening,
    entries: enrichedEntries,
    closingBalance: {
      totalDebit: opening.totalDebit + entries.reduce((sum, e) => sum + e.debit, 0),
      totalCredit: opening.totalCredit + entries.reduce((sum, e) => sum + e.credit, 0),
    },
  }
}

/**
 * Generate Trial Balance Report
 */
async function getTrialBalance(companyId, date) {
  const filter = { company: companyId, journalDate: { $lte: new Date(date || new Date()) } }

  const trialBalance = await GeneralLedger.aggregate([
    { $match: filter },
    {
      $group: {
        _id: "$ledgerCode",
        totalDebit: { $sum: "$debit" },
        totalCredit: { $sum: "$credit" },
        ledgerDescription: { $first: "$ledgerDescription" },
        ledgerType: { $first: "$ledgerType" },
      },
    },
    { $sort: { _id: 1 } },
  ])

  // Populate ledger details
  const enriched = await Promise.all(
    trialBalance.map(async (item) => {
      const ledger = await ChartOfAccount.findById(item._id)
      return {
        ...item,
        ledgerCode: ledger?.ledgerCode,
        ledgerType: ledger?.ledgerType,
      }
    }),
  )

  const totals = enriched.reduce(
    (acc, item) => ({
      debit: acc.debit + item.totalDebit,
      credit: acc.credit + item.totalCredit,
    }),
    { debit: 0, credit: 0 },
  )

  return {
    data: enriched,
    totals,
    balanced: Math.abs(totals.debit - totals.credit) < 0.01,
  }
}

/**
 * Export General Ledger data for CSV
 */
async function exportLedgerData({ companyId, q, startDate, endDate, layer, partner }) {
  const filter = { company: companyId }

  if (q) {
    filter.$or = [{ ledgerDescription: { $regex: q, $options: "i" } }, { journalNo: { $regex: q, $options: "i" } }]
  }

  if (startDate || endDate) {
    filter.journalDate = {}
    if (startDate) filter.journalDate.$gte = new Date(startDate)
    if (endDate) filter.journalDate.$lte = new Date(endDate)
  }

  if (layer) filter.layer = layer
  if (partner) filter.partner = partner

  return await GeneralLedger.find(filter)
    .populate("ledgerCode", "ledgerCode")
    .populate("partner", "name")
    .populate("currency", "code")
    .lean()
}

module.exports = {
  createLedgerEntriesFromJournal,
  getGeneralLedger,
  getAccountLedger,
  getTrialBalance,
  exportLedgerData,
}
