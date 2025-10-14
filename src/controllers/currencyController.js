const { asyncHandler } = require("../middleware/errorHandler")
const svc = require("../services/currencyService")

const listCurrencies = asyncHandler(async (req, res) => {
  const result = await svc.listCurrencies(req.query)
  res.json(result)
})

const getCurrency = asyncHandler(async (req, res) => {
  const doc = await svc.getCurrencyById(req.params.id)
  if (!doc) return res.status(404).json({ message: "Currency not found" })
  res.json({
    _id: doc._id,
    code: doc.code,
    name: doc.name,
    lastRateUpdate: doc.lastRateUpdate,
    currentRateUSD: doc.currentRateUSD,
    rates: doc.rates,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  })
})

const createCurrency = asyncHandler(async (req, res) => {
  const created = await svc.createCurrency(req.body)
  res.status(201).json(created)
})

const updateCurrency = asyncHandler(async (req, res) => {
  const updated = await svc.updateCurrency(req.params.id, req.body)
  if (!updated) return res.status(404).json({ message: "Currency not found" })
  res.json(updated)
})

const deleteCurrency = asyncHandler(async (req, res) => {
  const deleted = await svc.deleteCurrency(req.params.id)
  if (!deleted) return res.status(404).json({ message: "Currency not found" })
  res.json({ message: "Currency deleted" })
})

const addRate = asyncHandler(async (req, res) => {
  const updated = await svc.addRate(req.params.id, req.body)
  if (!updated) return res.status(404).json({ message: "Currency not found" })
  res.status(201).json(updated)
})

const removeRate = asyncHandler(async (req, res) => {
  const updated = await svc.removeRate(req.params.id, req.params.rateId)
  if (!updated) return res.status(404).json({ message: "Currency or rate not found" })
  res.json(updated)
})

const effectiveRate = asyncHandler(async (req, res) => {
  const code = String(req.params.code).toUpperCase()
  const at = req.query.at
  const cur = await svc.getCurrencyByCode(code)
  if (!cur) return res.status(404).json({ message: "Currency not found" })
  const rate = svc.computeEffectiveRate(cur, at)
  if (!rate) return res.status(404).json({ message: "No rate available for the requested time" })
  res.json({ code: cur.code, at: new Date(at || Date.now()), rateUSD: rate.rateUSD })
})

module.exports = {
  listCurrencies,
  getCurrency,
  createCurrency,
  updateCurrency,
  deleteCurrency,
  addRate,
  removeRate,
  effectiveRate,
}
