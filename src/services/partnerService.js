const mongoose = require("mongoose")
const Partner = require("../models/Partner")

function buildFilter({ q, layer, status }) {
  const filter = { isDeleted: false }
  if (q) filter.$text = { $search: q }
  if (layer) filter.layer = layer
  if (status) filter.partnerStatus = status
  return filter
}

async function listPartners(query) {
  const { page = 1, limit = 50, q, layer, status, sortBy = "createdAt", sortOrder = "desc" } = query
  const filter = buildFilter({ q, layer, status })
  const skip = (page - 1) * limit
  const sort = { [sortBy]: sortOrder === "asc" ? 1 : -1 }

  const [items, total] = await Promise.all([
    Partner.find(filter)
      .populate("parentAccount", "name layer")
      .populate("users", "name email")
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Partner.countDocuments(filter),
  ])

  return { data: items, page, limit, total, totalPages: Math.ceil(total / limit || 1) }
}

async function getPartner(id) {
  return Partner.findOne({ _id: id, isDeleted: false })
    .populate("parentAccount", "name layer")
    .populate("users", "name email role")
    .lean()
}

async function createPartner(payload) {
  const {
    name,
    phone,
    address,
    layer,
    parentAccountId = null,
    partnerStatus = "Active",
    priceList = "",
    creditLimit = 0,
    contactInformation = {},
    users = [],
    notes = "",
  } = payload

  // Validate parent account if provided
  const parentAccount = parentAccountId ? await Partner.findOne({ _id: parentAccountId, isDeleted: false }) : null
  if (parentAccountId && !parentAccount) {
    const err = new Error("Parent account not found")
    err.status = 404
    throw err
  }

  const doc = await Partner.create({
    name,
    phone,
    address,
    layer,
    parentAccount: parentAccount?._id || null,
    partnerStatus,
    priceList,
    creditLimit,
    contactInformation,
    users: users.filter((id) => mongoose.Types.ObjectId.isValid(id)),
    notes,
  })

  return getPartner(doc._id)
}

async function updatePartner(id, payload) {
  const update = { ...payload }

  // Handle parent account update
  if (typeof update.parentAccountId !== "undefined") {
    if (update.parentAccountId) {
      const parent = await Partner.findOne({ _id: update.parentAccountId, isDeleted: false })
      if (!parent) {
        const err = new Error("Parent account not found")
        err.status = 404
        throw err
      }
      update.parentAccount = parent._id
    } else {
      update.parentAccount = null
    }
    delete update.parentAccountId
  }

  // Validate users array if provided
  if (update.users && Array.isArray(update.users)) {
    update.users = update.users.filter((id) => mongoose.Types.ObjectId.isValid(id))
  }

  await Partner.updateOne({ _id: id, isDeleted: false }, { $set: update })
  return getPartner(id)
}

async function deletePartner(id) {
  await Partner.updateOne({ _id: id }, { $set: { isDeleted: true, partnerStatus: "Inactive" } })
  return { success: true }
}

async function getPartnersByLayer(layer) {
  return Partner.find({ layer, isDeleted: false, partnerStatus: "Active" }).select("_id name layer").lean()
}

async function getPartnerOptions() {
  // Produce UI-friendly groups by layer
  const active = await Partner.find({ isDeleted: false, partnerStatus: "Active" }).lean()
  const layers = ["Marine", "Commercial", "Selling"]
  const byLayer = layers.reduce((acc, l) => ({ ...acc, [l]: [] }), {})

  active.forEach((p) => {
    byLayer[p.layer]?.push(p)
  })

  const result = layers.map((layer) => ({
    heading: `${layer} Partners`,
    items: (byLayer[layer] || []).map((p) => ({ _id: p._id, label: p.name })),
  }))

  return result
}

module.exports = {
  listPartners,
  getPartner,
  createPartner,
  updatePartner,
  deletePartner,
  getPartnersByLayer,
  getPartnerOptions,
}
