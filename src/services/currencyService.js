const { Currency } = require("../models/Currency")

function normalizeCreatePayload(payload) {
  const doc = {
    code: String(payload.code).toUpperCase(),
    name: payload.name,
    rates: [],
  }

  // support either rates array or single at/rateUSD fields
  if (Array.isArray(payload.rates) && payload.rates.length) {
    doc.rates = payload.rates.map((r) => ({ at: new Date(r.at), rateUSD: Number(r.rateUSD) }))
  } else if (payload.at !== undefined && payload.rateUSD !== undefined) {
    doc.rates = [{ at: new Date(payload.at), rateUSD: Number(payload.rateUSD) }]
  }

  return doc
}

function buildFilter({ q }) {
  const filter = { isDeleted: false }
  if (q) {
    const regex = new RegExp(q, "i")
    Object.assign(filter, { $or: [{ code: regex }, { name: regex }] })
  }
  return filter
}

async function listCurrencies({ page = 1, limit = 10, q, sortBy = "code", sortOrder = "asc" }) {
  const filter = buildFilter({ q })
  const sort = { [sortBy]: sortOrder === "asc" ? 1 : -1 }

  const [total, items] = await Promise.all([
    Currency.countDocuments(filter),
    Currency.find(filter)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit),
  ])

  const data = items.map((c) => ({
    _id: c._id,
    code: c.code,
    name: c.name,
    lastRateUpdate: c.lastRateUpdate,
    currentRateUSD: c.currentRateUSD,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  }))

  return {
    data,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
  }
}

async function getCurrencyById(id) {
  return Currency.findOne({ _id: id, isDeleted: false })
}

async function getCurrencyByCode(code) {
  return Currency.findOne({ code: String(code).toUpperCase(), isDeleted: false })
}

async function createCurrency(payload) {
  const doc = normalizeCreatePayload(payload)
  try {
    const created = await Currency.create(doc)
    return created
  } catch (err) {
    if (err?.code === 11000) {
      const error = new Error("Currency code already exists")
      error.status = 409
      throw error
    }
    throw err
  }
}

async function updateCurrency(id, payload) {
  const updates = {}
  if (payload.code !== undefined) updates.code = String(payload.code).toUpperCase()
  if (payload.name !== undefined) updates.name = payload.name
  if (Array.isArray(payload.rates)) updates.rates = payload.rates

  const updated = await Currency.findOneAndUpdate({ _id: id, isDeleted: false }, updates, {
    new: true,
    runValidators: true,
  })
  return updated
}

async function deleteCurrency(id) {
  return Currency.findOneAndUpdate({ _id: id, isDeleted: false }, { isDeleted: true }, { new: true })
}

async function addRate(id, { at, rateUSD }) {
  const cur = await Currency.findOne({ _id: id, isDeleted: false })
  if (!cur) return null
  cur.rates.push({ at: new Date(at), rateUSD: Number(rateUSD) })
  await cur.save()
  return cur
}

async function removeRate(id, rateId) {
  const cur = await Currency.findOne({ _id: id, isDeleted: false })
  if (!cur) return null
  cur.rates = cur.rates.filter((r) => String(r._id) !== String(rateId))
  await cur.save()
  return cur
}

function computeEffectiveRate(cur, at) {
  if (!cur) return null
  const sorted = [...(cur.rates || [])].sort((a, b) => a.at - b.at)
  const target = at ? new Date(at) : new Date()
  if (isNaN(target.getTime())) return null
  let found = null
  for (let i = 0; i < sorted.length; i++) {
    const r = sorted[i]
    if (r.at <= target) found = r
    else break
  }
  return found
}

module.exports = {
  listCurrencies,
  getCurrencyById,
  getCurrencyByCode,
  createCurrency,
  updateCurrency,
  deleteCurrency,
  addRate,
  removeRate,
  computeEffectiveRate,
}
