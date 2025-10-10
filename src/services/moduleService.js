const Module = require("../models/Module")
const { MODULES } = require("../constants/rbac")

function sanitizeModule(doc) {
  if (!doc) return null
  const obj = doc.toObject({ versionKey: false })
  return obj
}

async function listModules({ activeOnly = true } = {}) {
  const filter = activeOnly ? { isActive: true } : {}
  const items = await Module.find(filter).sort({ name: 1 })
  return items.map(sanitizeModule)
}

async function createModule(payload) {
  const doc = await Module.create(payload)
  return sanitizeModule(doc)
}

async function seedDefaults() {
  let seeded = 0
  // Upsert each module to avoid duplicate seed runs and to add missing ones
  for (const mod of MODULES) {
    const res = await Module.updateOne(
      { code: mod.code },
      {
        $setOnInsert: { code: mod.code },
        $set: { name: mod.label, isActive: true, submodules: mod.submodules || [] },
      },
      { upsert: true },
    )
    // If upserted (inserted), res.upsertedCount === 1 (in mongoose 8, use acknowledged + upsertedId)
    if (res.upsertedCount === 1 || res.upsertedId) seeded++
  }
  const total = await Module.countDocuments({})
  return { seeded: seeded > 0, inserted: seeded, total }
}

module.exports = { listModules, createModule, seedDefaults }
