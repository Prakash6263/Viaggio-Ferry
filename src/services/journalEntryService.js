const createHttpError = require("http-errors")
const { JournalEntry } = require("../models/JournalEntry")
const { ChartOfAccount } = require("../models/ChartOfAccount")
const { createLedgerEntriesFromJournal } = require("./generalLedgerService")

async function listJournalEntries({
  companyId,
  page = 1,
  limit = 10,
  q,
  status,
  layer,
  sortBy = "journalDate",
  sortOrder = -1,
}) {
  const skip = (page - 1) * limit
  const filter = { company: companyId, isDeleted: false }

  if (status) filter.status = status
  if (layer) filter.layer = layer
  if (q) {
    filter.$or = [
      { journalNo: { $regex: q, $options: "i" } },
      { docReference: { $regex: q, $options: "i" } },
      { voyageNo: { $regex: q, $options: "i" } },
    ]
  }

  const total = await JournalEntry.countDocuments(filter)
  const entries = await JournalEntry.find(filter)
    .populate("partner", "name")
    .populate("journalLines.ledgerCode", "ledgerCode ledgerDescription")
    .populate("journalLines.currency", "code symbol")
    .populate("createdBy", "fullName email")
    .populate("postedBy", "fullName email")
    .sort({ [sortBy]: sortOrder })
    .skip(skip)
    .limit(limit)

  return {
    data: entries,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  }
}

async function getJournalEntryById(id, companyId) {
  return await JournalEntry.findOne({ _id: id, company: companyId, isDeleted: false })
    .populate("partner", "name")
    .populate("journalLines.ledgerCode", "ledgerCode ledgerDescription ledgerType")
    .populate("journalLines.currency", "code symbol")
    .populate("createdBy", "fullName email")
    .populate("postedBy", "fullName email")
}

async function createJournalEntry(data, companyId, userId) {
  // Validate that total debit equals total credit
  const totalDebit = data.journalLines.reduce((sum, line) => sum + (line.debit || 0), 0)
  const totalCredit = data.journalLines.reduce((sum, line) => sum + (line.credit || 0), 0)

  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    throw new createHttpError.BadRequest("Journal entry must be balanced (Debit = Credit)")
  }

  // Validate ledger accounts exist
  for (const line of data.journalLines) {
    const account = await ChartOfAccount.findOne({
      _id: line.ledgerCode,
      company: companyId,
    })
    if (!account) {
      throw new createHttpError.BadRequest(`Ledger account ${line.ledgerCode} not found for this company`)
    }
  }

  const entry = new JournalEntry({
    ...data,
    company: companyId,
    createdBy: userId,
    totalDebit,
    totalCredit,
  })

  return await entry.save()
}

async function updateJournalEntry(id, data, companyId) {
  const entry = await JournalEntry.findOne({ _id: id, company: companyId, isDeleted: false })
  if (!entry) return null

  // Prevent updating posted entries
  if (entry.status === "Posted") {
    throw new createHttpError.BadRequest("Cannot update a posted journal entry")
  }

  // Validate journal lines if being updated
  if (data.journalLines) {
    const totalDebit = data.journalLines.reduce((sum, line) => sum + (line.debit || 0), 0)
    const totalCredit = data.journalLines.reduce((sum, line) => sum + (line.credit || 0), 0)

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new createHttpError.BadRequest("Journal entry must be balanced (Debit = Credit)")
    }

    data.totalDebit = totalDebit
    data.totalCredit = totalCredit
  }

  Object.assign(entry, data)
  return await entry.save()
}

async function postJournalEntry(id, companyId, userId) {
  const entry = await JournalEntry.findOne({ _id: id, company: companyId, isDeleted: false })
  if (!entry) return null

  if (entry.status === "Posted") {
    throw new createHttpError.BadRequest("Journal entry is already posted")
  }

  entry.status = "Posted"
  entry.postedBy = userId
  entry.postedDate = new Date()

  const savedEntry = await entry.save()

  try {
    await createLedgerEntriesFromJournal(savedEntry._id, companyId)
  } catch (error) {
    // Log error but don't fail the posting
    console.error("[GeneralLedger] Failed to create ledger entries:", error.message)
  }

  return savedEntry
}

async function cancelJournalEntry(id, companyId) {
  const entry = await JournalEntry.findOne({ _id: id, company: companyId, isDeleted: false })
  if (!entry) return null

  entry.status = "Cancelled"
  return await entry.save()
}

async function deleteJournalEntry(id, companyId) {
  const entry = await JournalEntry.findOne({ _id: id, company: companyId, isDeleted: false })
  if (!entry) return null

  entry.isDeleted = true
  return await entry.save()
}

module.exports = {
  listJournalEntries,
  getJournalEntryById,
  createJournalEntry,
  updateJournalEntry,
  postJournalEntry,
  cancelJournalEntry,
  deleteJournalEntry,
}
