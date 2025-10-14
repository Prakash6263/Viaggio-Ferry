const { asyncHandler } = require("../middleware/errorHandler")
const svc = require("../services/promotionService")

const listPromotions = asyncHandler(async (req, res) => {
  const result = await svc.listPromotions(req.query)
  res.json(result)
})

const getPromotion = asyncHandler(async (req, res) => {
  const doc = await svc.getPromotionById(req.params.id)
  if (!doc) return res.status(404).json({ message: "Promotion not found" })
  res.json(doc)
})

const createPromotion = asyncHandler(async (req, res) => {
  const created = await svc.createPromotion(req.body)
  res.status(201).json(created)
})

const updatePromotion = asyncHandler(async (req, res) => {
  const updated = await svc.updatePromotion(req.params.id, req.body)
  if (!updated) return res.status(404).json({ message: "Promotion not found" })
  res.json(updated)
})

const deletePromotion = asyncHandler(async (req, res) => {
  const ok = await svc.deletePromotion(req.params.id)
  if (!ok) return res.status(404).json({ message: "Promotion not found" })
  res.json({ message: "Promotion deleted" })
})

const applyPromotion = asyncHandler(async (req, res) => {
  const result = await svc.applyPromotion(req.body)
  res.json(result)
})

module.exports = {
  listPromotions,
  getPromotion,
  createPromotion,
  updatePromotion,
  deletePromotion,
  applyPromotion,
}
