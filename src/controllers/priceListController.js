const { validationResult } = require("express-validator")
const {
  createPriceList,
  getPriceLists,
  getPriceList,
  updatePriceList,
  deletePriceList,
  addPriceDetail,
  updatePriceDetail,
  deletePriceDetail,
  getPriceDetails,
  calculatePrice,
} = require("../services/priceListService")

function handleValidation(req) {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    const err = new Error("Validation failed")
    err.status = 400
    err.details = errors.array()
    throw err
  }
}

async function create(req, res) {
  handleValidation(req)
  const priceList = await createPriceList({
    ...req.body,
    company: req.user.company,
    createdBy: req.user.id,
  })
  res.status(201).json({
    success: true,
    message: "Price list created successfully",
    data: priceList,
  })
}

async function index(req, res) {
  const { page = 1, limit = 10, q, status, type } = req.query
  const result = await getPriceLists(
    { company: req.user.company, q, status, type },
    Number.parseInt(page),
    Number.parseInt(limit),
  )
  res.json({
    success: true,
    data: result.data,
    pagination: result.pagination,
  })
}

async function show(req, res) {
  const priceList = await getPriceList(req.params.id)
  if (!priceList) {
    const err = new Error("Price list not found")
    err.status = 404
    throw err
  }
  res.json({
    success: true,
    data: priceList,
  })
}

async function update(req, res) {
  handleValidation(req)
  const priceList = await updatePriceList(req.params.id, {
    ...req.body,
    updatedBy: req.user.id,
  })
  if (!priceList) {
    const err = new Error("Price list not found")
    err.status = 404
    throw err
  }
  res.json({
    success: true,
    message: "Price list updated successfully",
    data: priceList,
  })
}

async function destroy(req, res) {
  await deletePriceList(req.params.id)
  res.json({
    success: true,
    message: "Price list deleted successfully",
  })
}

async function addDetail(req, res) {
  handleValidation(req)
  const detail = await addPriceDetail(req.params.id, req.body)
  res.status(201).json({
    success: true,
    message: "Price detail added successfully",
    data: detail,
  })
}

async function updateDetail(req, res) {
  handleValidation(req)
  const detail = await updatePriceDetail(req.params.detailId, req.body)
  if (!detail) {
    const err = new Error("Price detail not found")
    err.status = 404
    throw err
  }
  res.json({
    success: true,
    message: "Price detail updated successfully",
    data: detail,
  })
}

async function deleteDetail(req, res) {
  await deletePriceDetail(req.params.detailId)
  res.json({
    success: true,
    message: "Price detail deleted successfully",
  })
}

async function getDetails(req, res) {
  const { page = 1, limit = 20, typeField, ticketType, cabin } = req.query
  const result = await getPriceDetails(
    req.params.id,
    { typeField, ticketType, cabin },
    Number.parseInt(page),
    Number.parseInt(limit),
  )
  res.json({
    success: true,
    data: result.data,
    pagination: result.pagination,
  })
}

async function calculatePriceHandler(req, res) {
  handleValidation(req)
  const priceDetail = await calculatePrice(req.body)
  if (!priceDetail) {
    const err = new Error("No matching price found for the given criteria")
    err.status = 404
    throw err
  }
  res.json({
    success: true,
    data: priceDetail,
  })
}

module.exports = {
  create,
  index,
  show,
  update,
  destroy,
  addDetail,
  updateDetail,
  deleteDetail,
  getDetails,
  calculatePrice: calculatePriceHandler,
}
