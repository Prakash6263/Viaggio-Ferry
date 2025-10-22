const mongoose = require("mongoose")
const B2CCustomer = require("../models/B2CCustomer")
const Partner = require("../models/Partner")

function buildFilter({ q, partner, status }) {
  const filter = { isDeleted: false }
  if (q) filter.$text = { $search: q }
  if (partner) filter.partner = partner
  if (status) filter.status = status
  return filter
}

async function listB2CCustomers(query) {
  const { page = 1, limit = 50, q, partner, status, sortBy = "createdAt", sortOrder = "desc" } = query
  const filter = buildFilter({ q, partner, status })
  const skip = (page - 1) * limit
  const sort = { [sortBy]: sortOrder === "asc" ? 1 : -1 }

  const [items, total] = await Promise.all([
    B2CCustomer.find(filter).populate("partner", "name layer").sort(sort).skip(skip).limit(limit).lean(),
    B2CCustomer.countDocuments(filter),
  ])

  return { data: items, page, limit, total, totalPages: Math.ceil(total / limit || 1) }
}

async function getB2CCustomer(id) {
  return B2CCustomer.findOne({ _id: id, isDeleted: false }).populate("partner", "name layer").lean()
}

async function createB2CCustomer(payload) {
  const {
    name,
    partnerId,
    nationality,
    password,
    whatsappNumber,
    status = "Active",
    address = {},
    notes = "",
  } = payload

  // Validate partner exists
  const partner = await Partner.findOne({ _id: partnerId, isDeleted: false })
  if (!partner) {
    const err = new Error("Partner not found")
    err.status = 404
    throw err
  }

  const doc = await B2CCustomer.create({
    name,
    partner: partner._id,
    nationality,
    password,
    whatsappNumber,
    status,
    address,
    notes,
  })

  return getB2CCustomer(doc._id)
}

async function updateB2CCustomer(id, payload) {
  const update = { ...payload }

  // Handle partner update
  if (typeof update.partnerId !== "undefined") {
    const partner = await Partner.findOne({ _id: update.partnerId, isDeleted: false })
    if (!partner) {
      const err = new Error("Partner not found")
      err.status = 404
      throw err
    }
    update.partner = partner._id
    delete update.partnerId
  }

  await B2CCustomer.updateOne({ _id: id, isDeleted: false }, { $set: update })
  return getB2CCustomer(id)
}

async function deleteB2CCustomer(id) {
  await B2CCustomer.updateOne({ _id: id }, { $set: { isDeleted: true, status: "Inactive" } })
  return { success: true }
}

async function getB2CCustomersByPartner(partnerId) {
  return B2CCustomer.find({ partner: partnerId, isDeleted: false, status: "Active" })
    .select("_id name whatsappNumber")
    .lean()
}

module.exports = {
  listB2CCustomers,
  getB2CCustomer,
  createB2CCustomer,
  updateB2CCustomer,
  deleteB2CCustomer,
  getB2CCustomersByPartner,
}
