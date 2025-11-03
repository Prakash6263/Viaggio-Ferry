const createHttpError = require("http-errors")
const {
  listJournalEntries,
  getJournalEntryById,
  createJournalEntry,
  updateJournalEntry,
  postJournalEntry,
  cancelJournalEntry,
  deleteJournalEntry,
} = require("../services/journalEntryService")

async function getAll(req, res, next) {
  try {
    const { page, limit, q, status, layer, sortBy, sortOrder } = req.query
    const result = await listJournalEntries({
      companyId: req.companyId,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      q,
      status,
      layer,
      sortBy,
      sortOrder: sortOrder === "asc" ? 1 : -1,
    })
    res.json(result)
  } catch (err) {
    next(err)
  }
}

async function getOne(req, res, next) {
  try {
    const entry = await getJournalEntryById(req.params.id, req.companyId)
    if (!entry) throw new createHttpError.NotFound("Journal entry not found")
    res.json(entry)
  } catch (err) {
    next(err)
  }
}

async function create(req, res, next) {
  try {
    const created = await createJournalEntry(req.body, req.companyId, req.userId)
    res.status(201).json(created)
  } catch (err) {
    if (err && err.code === 11000) {
      return next(new createHttpError.Conflict("Journal number already exists for this company"))
    }
    next(err)
  }
}

async function update(req, res, next) {
  try {
    const updated = await updateJournalEntry(req.params.id, req.body, req.companyId)
    if (!updated) throw new createHttpError.NotFound("Journal entry not found")
    res.json(updated)
  } catch (err) {
    next(err)
  }
}

async function post(req, res, next) {
  try {
    const updated = await postJournalEntry(req.params.id, req.companyId, req.userId)
    if (!updated) throw new createHttpError.NotFound("Journal entry not found")
    res.json({ message: "Journal entry posted successfully", data: updated })
  } catch (err) {
    next(err)
  }
}

async function cancel(req, res, next) {
  try {
    const updated = await cancelJournalEntry(req.params.id, req.companyId)
    if (!updated) throw new createHttpError.NotFound("Journal entry not found")
    res.json({ message: "Journal entry cancelled", data: updated })
  } catch (err) {
    next(err)
  }
}

async function remove(req, res, next) {
  try {
    const result = await deleteJournalEntry(req.params.id, req.companyId)
    if (!result) throw new createHttpError.NotFound("Journal entry not found")
    res.json({ message: "Journal entry deleted" })
  } catch (err) {
    next(err)
  }
}

module.exports = {
  getAll,
  getOne,
  create,
  update,
  post,
  cancel,
  remove,
}
