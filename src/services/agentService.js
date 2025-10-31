const mongoose = require("mongoose")
const Agent = require("../models/Agent")

function buildFilter({ q, type, status }, companyId) {
  const filter = { isDeleted: false, company: companyId }
  if (q) filter.$text = { $search: q }
  if (type) filter.type = type
  if (status) filter.status = status
  return filter
}

async function listAgents(query, companyId) {
  const { page = 1, limit = 50, q, type, status, sortBy = "depth", sortOrder = "asc" } = query
  const filter = buildFilter({ q, type, status }, companyId)
  const skip = (page - 1) * limit
  const sort = { [sortBy]: sortOrder === "asc" ? 1 : -1 }

  const [items, total] = await Promise.all([
    Agent.find(filter).populate("parent", "name code type").sort(sort).skip(skip).limit(limit).lean(),
    Agent.countDocuments(filter),
  ])

  return { data: items, page, limit, total, totalPages: Math.ceil(total / limit || 1) }
}

async function getAgent(id, companyId) {
  return Agent.findOne({ _id: id, company: companyId, isDeleted: false }).populate("parent", "name code type").lean()
}

async function createAgent(payload, companyId) {
  const { name, code, type, parentId = null, status = "Active", notes = "" } = payload
  const parent = parentId ? await Agent.findOne({ _id: parentId, company: companyId, isDeleted: false }) : null
  const depth = parent ? (parent.depth || 0) + 1 : 0

  const exists = await Agent.findOne({ company: companyId, code: code.toUpperCase(), isDeleted: false }).lean()
  if (exists) {
    const err = new Error("Agent code already exists")
    err.status = 409
    throw err
  }

  const doc = await Agent.create({
    company: companyId,
    name,
    code: code.toUpperCase(),
    type,
    parent: parent?._id || null,
    depth,
    status,
    notes,
  })
  return getAgent(doc._id, companyId)
}

async function updateAgent(id, payload, companyId) {
  const update = { ...payload }
  if (update.code) update.code = update.code.toUpperCase()

  if (typeof update.parentId !== "undefined") {
    const parent = update.parentId ? await Agent.findOne({ _id: update.parentId, company: companyId }) : null
    update.parent = parent ? parent._id : null
    update.depth = parent ? (parent.depth || 0) + 1 : 0
    delete update.parentId
  }

  if (update.code) {
    const exists = await Agent.findOne({
      _id: { $ne: id },
      company: companyId,
      code: update.code,
      isDeleted: false,
    }).lean()
    if (exists) {
      const err = new Error("Agent code already exists")
      err.status = 409
      throw err
    }
  }

  await Agent.updateOne({ _id: id, company: companyId, isDeleted: false }, { $set: update })
  return getAgent(id, companyId)
}

async function deleteAgent(id, companyId) {
  await Agent.updateOne({ _id: id, company: companyId }, { $set: { isDeleted: true, status: "Inactive" } })
  return { success: true }
}

async function getAgentTree(companyId) {
  const agents = await Agent.find({ company: companyId, isDeleted: false, status: "Active" }).lean()
  const byParent = agents.reduce((acc, a) => {
    const pid = a.parent ? String(a.parent) : "root"
    acc[pid] = acc[pid] || []
    acc[pid].push(a)
    return acc
  }, {})

  function build(parentId = "root") {
    return (byParent[parentId] || []).map((a) => ({
      _id: a._id,
      name: a.name,
      code: a.code,
      type: a.type,
      children: build(String(a._id)),
    }))
  }

  return build("root")
}

async function getAgentGroupedOptions(companyId) {
  const active = await Agent.find({ company: companyId, isDeleted: false, status: "Active" }).lean()
  const groups = ["Company", "Marine", "Commercial", "Selling"]
  const byType = groups.reduce((acc, t) => ({ ...acc, [t]: [] }), {})
  active.forEach((a) => {
    byType[a.type]?.push(a)
  })

  function labelFromNode(a, map) {
    const parts = [a.name]
    let current = a
    while (current.parent) {
      current = map.get(String(current.parent)) || null
      if (!current) break
      parts.unshift(current.name)
    }
    return parts.join(" > ")
  }

  const map = new Map(active.map((a) => [String(a._id), a]))
  const result = groups.map((type) => ({
    heading: type === "Company" ? "Company" : `${type} Agents`,
    items: (byType[type] || []).map((a) => ({ _id: a._id, label: labelFromNode(a, map) })),
  }))

  return result
}

module.exports = {
  listAgents,
  getAgent,
  createAgent,
  updateAgent,
  deleteAgent,
  getAgentTree,
  getAgentGroupedOptions,
}
