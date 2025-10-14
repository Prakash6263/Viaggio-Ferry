const mongoose = require("mongoose")
const User = require("../models/User")

function buildFilter({ q, status, isSalesman, agentId }) {
  const filter = { isDeleted: false }
  if (q) {
    filter.$text = { $search: q }
  }
  if (status) filter.status = status
  if (typeof isSalesman === "boolean") filter.isSalesman = isSalesman
  if (agentId && mongoose.isValidObjectId(agentId)) filter.agent = agentId
  return filter
}

async function listUsers(query) {
  const { page = 1, limit = 10, q, status, isSalesman, agentId, sortBy = "createdAt", sortOrder = "desc" } = query
  const filter = buildFilter({ q, status, isSalesman, agentId })
  const skip = (page - 1) * limit
  const sort = { [sortBy]: sortOrder === "asc" ? 1 : -1 }

  const [items, total] = await Promise.all([
    User.find(filter)
      .populate({ path: "agent", select: "name code type" })
      .populate({ path: "accessGroups", select: "groupCode groupName moduleCode layer" })
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
  ])

  return {
    data: items,
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit || 1),
  }
}

async function getUser(id) {
  return User.findOne({ _id: id, isDeleted: false })
    .populate({ path: "agent", select: "name code type" })
    .populate({ path: "accessGroups", select: "groupCode groupName moduleCode layer" })
    .lean()
}

async function createUser(payload) {
  const {
    fullName,
    email,
    position,
    agentId,
    isSalesman = false,
    remarks = "",
    status = "Active",
    accessGroups = [],
  } = payload

  const exists = await User.findOne({ email: email.toLowerCase(), isDeleted: false }).lean()
  if (exists) {
    const err = new Error("Email already in use")
    err.status = 409
    throw err
  }

  const doc = await User.create({
    fullName,
    email: email.toLowerCase(),
    position,
    agent: agentId || null,
    isSalesman,
    remarks,
    status,
    accessGroups,
  })

  return getUser(doc._id)
}

async function updateUser(id, payload) {
  const update = { ...payload }
  if (update.email) {
    update.email = update.email.toLowerCase()
    const exists = await User.findOne({ _id: { $ne: id }, email: update.email, isDeleted: false }).lean()
    if (exists) {
      const err = new Error("Email already in use")
      err.status = 409
      throw err
    }
  }
  if (typeof update.agentId !== "undefined") {
    update.agent = update.agentId
    delete update.agentId
  }
  await User.updateOne({ _id: id, isDeleted: false }, { $set: update })
  return getUser(id)
}

async function deleteUser(id) {
  await User.updateOne({ _id: id }, { $set: { isDeleted: true, status: "Inactive" } })
  return { success: true }
}

module.exports = {
  listUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
}
