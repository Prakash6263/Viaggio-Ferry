const { Tax } = require("../models/Tax")

const listTaxes = async ({ page = 1, limit = 10, q, status, type, form, sortBy = "createdAt", sortOrder = "desc" }) => {
  const filter = { isDeleted: false }
  if (q) filter.$or = [{ code: new RegExp(q, "i") }, { name: new RegExp(q, "i") }, { ledgerCode: new RegExp(q, "i") }]
  if (status) filter.status = status
  if (type) filter.type = type
  if (form) filter.form = form

  const sort = { [sortBy]: sortOrder === "asc" ? 1 : -1 }

  const [items, total] = await Promise.all([
    Tax.find(filter)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit),
    Tax.countDocuments(filter),
  ])

  return {
    items,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  }
}

const getTaxById = async (id) => {
  const tax = await Tax.findOne({ _id: id, isDeleted: false })
  return tax
}

const createTax = async (data) => {
  if (data.code) data.code = data.code.toUpperCase()
  const exists = await Tax.findOne({ code: data.code, isDeleted: false })
  if (exists) throw new Error("Tax with this code already exists")
  const tax = await Tax.create(data)
  return tax
}

const updateTax = async (id, data) => {
  if (data.code) data.code = data.code.toUpperCase()
  const tax = await Tax.findOneAndUpdate({ _id: id, isDeleted: false }, { $set: data }, { new: true })
  return tax
}

const deleteTax = async (id) => {
  const tax = await Tax.findOneAndUpdate(
    { _id: id, isDeleted: false },
    { $set: { isDeleted: true, status: "Inactive" } },
    { new: true },
  )
  return tax
}

module.exports = {
  listTaxes,
  getTaxById,
  createTax,
  updateTax,
  deleteTax,
}
