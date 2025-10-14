const asyncHandler = require("express-async-handler")
const { listTaxes, getTaxById, createTax, updateTax, deleteTax } = require("../services/taxService")

const list = asyncHandler(async (req, res) => {
  const data = await listTaxes(req.query)
  res.json(data)
})

const getOne = asyncHandler(async (req, res) => {
  const tax = await getTaxById(req.params.id)
  if (!tax) return res.status(404).json({ message: "Tax not found" })
  res.json(tax)
})

const create = asyncHandler(async (req, res) => {
  const tax = await createTax(req.body)
  res.status(201).json(tax)
})

const update = asyncHandler(async (req, res) => {
  const tax = await updateTax(req.params.id, req.body)
  if (!tax) return res.status(404).json({ message: "Tax not found" })
  res.json(tax)
})

const remove = asyncHandler(async (req, res) => {
  const tax = await deleteTax(req.params.id)
  if (!tax) return res.status(404).json({ message: "Tax not found" })
  res.json({ message: "Deleted", id: tax._id })
})

module.exports = {
  list,
  getOne,
  create,
  update,
  remove,
}
