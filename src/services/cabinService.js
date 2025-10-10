const { Cabin } = require("../models/Cabin")

const buildFilter = ({ q, type, status }) => {
  const filter = { isDeleted: false }
  if (type) filter.type = type
  if (status) filter.status = status
  if (q) {
    const regex = new RegExp(q, "i")
    Object.assign(filter, { $or: [{ name: regex }, { description: regex }] })
  }
  return filter
}

async function listCabins({ page = 1, limit = 10, q, type, status, sortBy = "createdAt", sortOrder = "desc" }) {
  const filter = buildFilter({ q, type, status })
  const sort = { [sortBy]: sortOrder === "asc" ? 1 : -1 }
  const [total, data] = await Promise.all([
    Cabin.countDocuments(filter),
    Cabin.find(filter)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit),
  ])
  return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 } }
}

async function getCabinById(id) {
  return Cabin.findOne({ _id: id, isDeleted: false })
}

async function createCabin(payload) {
  const doc = {
    name: payload.name,
    description: payload.description || "",
    remarks: payload.remarks || "",
    type: payload.type,
    status: payload.status || "Inactive",
  }
  return Cabin.create(doc)
}

async function updateCabin(id, payload) {
  const updates = {}
  if (payload.name !== undefined) updates.name = payload.name
  if (payload.description !== undefined) updates.description = payload.description
  if (payload.remarks !== undefined) updates.remarks = payload.remarks
  if (payload.type !== undefined) updates.type = payload.type
  if (payload.status !== undefined) updates.status = payload.status

  return Cabin.findOneAndUpdate({ _id: id, isDeleted: false }, updates, {
    new: true,
    runValidators: true,
  })
}

async function deleteCabin(id) {
  return Cabin.findOneAndUpdate({ _id: id, isDeleted: false }, { isDeleted: true }, { new: true })
}

module.exports = { listCabins, getCabinById, createCabin, updateCabin, deleteCabin }
