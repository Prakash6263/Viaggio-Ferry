const AccessGroup = require("../models/AccessGroup")
const Module = require("../models/Module")

function sanitize(doc) {
  if (!doc) return null
  const obj = doc.toObject({ versionKey: false })
  return obj
}

async function listGroups({ companyId, page = 1, limit = 10, q = "", moduleCode, layer, status }) {
  const filter = { company: companyId }
  if (q) filter.groupName = { $regex: q, $options: "i" }
  if (moduleCode) filter.moduleCode = moduleCode.toLowerCase()
  if (layer) filter.layer = layer
  if (status === "active") filter.isActive = true
  if (status === "inactive") filter.isActive = false

  const pageNum = Math.max(Number.parseInt(page, 10) || 1, 1)
  const limitNum = Math.max(Number.parseInt(limit, 10) || 10, 1)
  const skip = (pageNum - 1) * limitNum

  const [items, total] = await Promise.all([
    AccessGroup.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
    AccessGroup.countDocuments(filter),
  ])

  // Attach module names for convenience
  const moduleCodes = [...new Set(items.map((g) => g.moduleCode))]
  const modules = await Module.find({ code: { $in: moduleCodes } })
    .select("code name")
    .lean()
  const nameByCode = Object.fromEntries(modules.map((m) => [m.code, m.name]))

  return {
    items: items.map((g) => {
      const obj = sanitize(g)
      obj.moduleName = nameByCode[obj.moduleCode] || obj.moduleCode
      return obj
    }),
    total,
    page: pageNum,
    limit: limitNum,
    pages: Math.ceil(total / limitNum),
  }
}

async function createGroup(payload) {
  payload.moduleCode = String(payload.moduleCode).toLowerCase()
  const doc = await AccessGroup.create(payload)
  return sanitize(doc)
}

async function getGroup(id) {
  const doc = await AccessGroup.findById(id)
  return sanitize(doc)
}

async function updateGroup(id, payload) {
  if (payload.moduleCode) payload.moduleCode = String(payload.moduleCode).toLowerCase()
  const doc = await AccessGroup.findByIdAndUpdate(id, payload, { new: true, runValidators: true })
  return sanitize(doc)
}

async function deleteGroup(id) {
  await AccessGroup.findByIdAndDelete(id)
  return { success: true }
}

module.exports = { listGroups, createGroup, getGroup, updateGroup, deleteGroup }
