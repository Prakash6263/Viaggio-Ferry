const PriceList = require("../models/PriceList")
const PriceListDetail = require("../models/PriceListDetail")

// Create a new price list
async function createPriceList(data) {
  const priceList = new PriceList(data)
  await priceList.save()
  return priceList.populate("company createdBy")
}

// Get all price lists with pagination, search, and type filtering
async function getPriceLists(query = {}, page = 1, limit = 10) {
  const skip = (page - 1) * limit
  const filter = {}

  if (query.company) filter.company = query.company
  if (query.status) filter.status = query.status
  if (query.type) filter.type = query.type
  if (query.q) {
    filter.name = { $regex: query.q, $options: "i" }
  }

  const priceLists = await PriceList.find(filter)
    .populate("company createdBy updatedBy")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)

  const total = await PriceList.countDocuments(filter)

  return {
    data: priceLists,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  }
}

// Get single price list with details
async function getPriceList(id) {
  const priceList = await PriceList.findById(id).populate("company createdBy updatedBy")
  if (!priceList) throw new Error("Price list not found")

  const details = await PriceListDetail.find({ priceList: id }).populate("originPort destinationPort")

  return { ...priceList.toObject(), details }
}

// Update price list header
async function updatePriceList(id, data) {
  const priceList = await PriceList.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  }).populate("company createdBy updatedBy")

  if (!priceList) throw new Error("Price list not found")
  return priceList
}

// Delete price list and all details
async function deletePriceList(id) {
  const priceList = await PriceList.findByIdAndDelete(id)
  if (!priceList) throw new Error("Price list not found")

  await PriceListDetail.deleteMany({ priceList: id })
  return priceList
}

// Add price detail row
async function addPriceDetail(priceListId, data) {
  // Calculate total price
  const taxAmount = data.taxes.reduce((sum, tax) => sum + tax.amount, 0)
  const totalPrice = data.basicPrice + taxAmount

  const detail = new PriceListDetail({
    ...data,
    priceList: priceListId,
    totalPrice,
  })

  await detail.save()
  return detail.populate("originPort destinationPort")
}

// Update price detail row
async function updatePriceDetail(detailId, data) {
  // Recalculate total price if taxes or basic price changed
  if (data.basicPrice || data.taxes) {
    const basicPrice = data.basicPrice || (await PriceListDetail.findById(detailId)).basicPrice
    const taxes = data.taxes || (await PriceListDetail.findById(detailId)).taxes
    const taxAmount = taxes.reduce((sum, tax) => sum + tax.amount, 0)
    data.totalPrice = basicPrice + taxAmount
  }

  const detail = await PriceListDetail.findByIdAndUpdate(detailId, data, {
    new: true,
    runValidators: true,
  }).populate("originPort destinationPort")

  if (!detail) throw new Error("Price detail not found")
  return detail
}

// Delete price detail row
async function deletePriceDetail(detailId) {
  const detail = await PriceListDetail.findByIdAndDelete(detailId)
  if (!detail) throw new Error("Price detail not found")
  return detail
}

// Get price details for a price list
async function getPriceDetails(priceListId, query = {}, page = 1, limit = 20) {
  const skip = (page - 1) * limit
  const filter = { priceList: priceListId }

  if (query.typeField) filter.typeField = query.typeField
  if (query.ticketType) filter.ticketType = query.ticketType
  if (query.cabin) filter.cabin = query.cabin

  const details = await PriceListDetail.find(filter).populate("originPort destinationPort").skip(skip).limit(limit)

  const total = await PriceListDetail.countDocuments(filter)

  return {
    data: details,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  }
}

// Calculate price based on criteria
async function calculatePrice(criteria) {
  const { priceListId, typeField, ticketType, cabin, originPort, destinationPort, visaType } = criteria

  const priceDetail = await PriceListDetail.findOne({
    priceList: priceListId,
    typeField,
    ticketType,
    cabin,
    originPort,
    destinationPort,
    visaType: visaType || "N/A",
  })

  if (!priceDetail) throw new Error("No pricing found for the given criteria")
  return priceDetail
}

module.exports = {
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
}
