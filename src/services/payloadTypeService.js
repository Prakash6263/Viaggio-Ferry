const { PayloadType } = require("../models/PayloadType")

const buildFilter = ({ q, category, status }) => {
  const filter = { isDeleted: false }
  if (category) filter.category = category
  if (status) filter.status = status
  if (q) {
    const regex = new RegExp(q, "i")
    Object.assign(filter, { $or: [{ name: regex }, { code: regex }, { description: regex }, { dimensions: regex }] })
  }
  return filter
}

async function listPayloadTypes({
  page = 1,
  limit = 10,
  q,
  category,
  status,
  sortBy = "createdAt",
  sortOrder = "desc",
}) {
  const filter = buildFilter({ q, category, status })
  const sort = { [sortBy]: sortOrder === "asc" ? 1 : -1 }
  const [total, data] = await Promise.all([
    PayloadType.countDocuments(filter),
    PayloadType.find(filter)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit),
  ])
  return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 } }
}

async function getPayloadTypeById(id) {
  return PayloadType.findOne({ _id: id, isDeleted: false })
}

async function createPayloadType(payload) {
  const doc = {
    name: payload.name,
    code: payload.code,
    description: payload.description || "",
    category: payload.category,
    maxWeightKg: payload.maxWeightKg ?? 0,
    dimensions: payload.dimensions || "",
    status: payload.status || "Active",
  }
  return PayloadType.create(doc)
}

async function updatePayloadType(id, payload) {
  const updates = {}
  ;["name", "code", "description", "category", "dimensions", "status"].forEach((k) => {
    if (payload[k] !== undefined) updates[k] = payload[k]
  })
  if (payload.maxWeightKg !== undefined) updates.maxWeightKg = payload.maxWeightKg
  return PayloadType.findOneAndUpdate({ _id: id, isDeleted: false }, updates, { new: true, runValidators: true })
}

async function deletePayloadType(id) {
  return PayloadType.findOneAndUpdate({ _id: id, isDeleted: false }, { isDeleted: true }, { new: true })
}

module.exports = {
  listPayloadTypes,
  getPayloadTypeById,
  createPayloadType,
  updatePayloadType,
  deletePayloadType,
}
