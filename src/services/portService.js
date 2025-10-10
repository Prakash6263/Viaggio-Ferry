const { Port } = require("../models/Port")

const buildFilter = ({ q, status }) => {
  const filter = { isDeleted: false }
  if (status) filter.status = status
  if (q) {
    const regex = new RegExp(q, "i")
    Object.assign(filter, {
      $or: [{ name: regex }, { code: regex }, { country: regex }],
    })
  }
  return filter
}

async function listPorts({ page = 1, limit = 10, q, status, sortBy = "createdAt", sortOrder = "desc" }) {
  const filter = buildFilter({ q, status })
  const sort = { [sortBy]: sortOrder === "asc" ? 1 : -1 }

  const [total, data] = await Promise.all([
    Port.countDocuments(filter),
    Port.find(filter)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit),
  ])

  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  }
}

async function getPortById(id) {
  const port = await Port.findOne({ _id: id, isDeleted: false })
  return port
}

async function createPort(payload) {
  const doc = {
    name: payload.name,
    code: payload.code?.toUpperCase(),
    country: payload.country,
    timezone: payload.timezone,
    status: payload.status || "Active",
    notes: payload.notes || "",
  }
  return await Port.create(doc)
}

async function updatePort(id, payload) {
  const updates = {}
  if (payload.name !== undefined) updates.name = payload.name
  if (payload.code !== undefined) updates.code = String(payload.code).toUpperCase()
  if (payload.country !== undefined) updates.country = payload.country
  if (payload.timezone !== undefined) updates.timezone = payload.timezone
  if (payload.status !== undefined) updates.status = payload.status
  if (payload.notes !== undefined) updates.notes = payload.notes

  const updated = await Port.findOneAndUpdate({ _id: id, isDeleted: false }, updates, {
    new: true,
    runValidators: true,
  })
  return updated
}

async function deletePort(id) {
  // soft delete to be safe
  const result = await Port.findOneAndUpdate({ _id: id, isDeleted: false }, { isDeleted: true }, { new: true })
  return result
}

module.exports = {
  listPorts,
  getPortById,
  createPort,
  updatePort,
  deletePort,
}
