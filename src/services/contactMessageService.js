const ContactMessage = require("../models/ContactMessage")

async function createMessage(payload) {
  const doc = await ContactMessage.create(payload)
  return doc
}

async function getMessageById(id) {
  const doc = await ContactMessage.findOne({ _id: id, isDeleted: false })
  return doc
}

async function updateMessage(id, updates) {
  const doc = await ContactMessage.findOneAndUpdate({ _id: id, isDeleted: false }, { $set: updates }, { new: true })
  return doc
}

async function softDeleteMessage(id) {
  const doc = await ContactMessage.findOneAndUpdate(
    { _id: id, isDeleted: false },
    { $set: { isDeleted: true } },
    { new: true },
  )
  return doc
}

async function listMessages({ page = 1, limit = 10, q, status, sortBy = "createdAt", sortOrder = "desc" }) {
  const filter = { isDeleted: false }
  if (status) filter.status = status

  // search q across multiple fields (uses text index if present; fallback regex)
  if (q && q.trim()) {
    filter.$text = { $search: q.trim() }
  }

  const sort = { [sortBy]: sortOrder === "asc" ? 1 : -1 }

  const skip = (page - 1) * limit
  const [data, total] = await Promise.all([
    ContactMessage.find(filter).sort(sort).skip(skip).limit(limit),
    ContactMessage.countDocuments(filter),
  ])

  const totalPages = Math.ceil(total / limit) || 1

  return { data, page, limit, total, totalPages }
}

module.exports = {
  createMessage,
  getMessageById,
  updateMessage,
  softDeleteMessage,
  listMessages,
}
