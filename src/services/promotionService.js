const { Promotion } = require("../models/Promotion")
const { Types } = require("mongoose")

function buildListQuery({ q, status, basis, tripId, activeOn }) {
  const query = { isDeleted: false }
  if (q) query.$text = { $search: q }
  if (status) query.status = status
  if (basis) query.basis = basis
  if (tripId) query.tripId = new Types.ObjectId(tripId)
  if (activeOn) {
    const at = new Date(activeOn)
    // matches PERIOD containing 'at' OR TRIP (active regardless of time)
    query.$or = [
      { basis: "PERIOD", "period.startAt": { $lte: at }, "period.endAt": { $gte: at } },
      { basis: "TRIP" }, // filtered further by tripId if provided
    ]
  }
  return query
}

async function listPromotions(params) {
  const { page = 1, limit = 10, sortBy = "createdAt", sortOrder = "desc", ...filters } = params

  const query = buildListQuery(filters)
  const sort = { [sortBy]: sortOrder === "asc" ? 1 : -1 }

  const [items, total] = await Promise.all([
    Promotion.find(query)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Promotion.countDocuments(query),
  ])

  return {
    items,
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  }
}

async function getPromotionById(id) {
  return Promotion.findOne({ _id: id, isDeleted: false }).lean()
}

async function createPromotion(payload) {
  return Promotion.create(payload)
}

async function updatePromotion(id, payload) {
  const updated = await Promotion.findOneAndUpdate({ _id: id, isDeleted: false }, { $set: payload }, { new: true })
  return updated?.toObject()
}

async function deletePromotion(id) {
  const updated = await Promotion.findOneAndUpdate(
    { _id: id, isDeleted: false },
    { $set: { isDeleted: true, status: "Inactive" } },
    { new: true },
  )
  return !!updated
}

// -------- Eligibility + discount calculations ----------

function matchesEligibility(item, conditions = []) {
  if (!conditions || conditions.length === 0) return true
  return conditions.some(
    (c) =>
      (!c.passengerType || c.passengerType === item.passengerType) &&
      (!c.cabinClass || c.cabinClass === item.cabinClass),
  )
}

function matchesCargoEligibility(item, conditions = []) {
  if (!conditions || conditions.length === 0) return true
  return conditions.some((c) => !c.cargoType || c.cargoType === item.cargoType)
}

function matchesVehicleEligibility(item, conditions = []) {
  if (!conditions || conditions.length === 0) return true
  return conditions.some((c) => !c.vehicleType || c.vehicleType === item.vehicleType)
}

function summarizePassengerCart(items, eligibilityConditions = []) {
  const passengerItems = (items || []).filter(
    (i) => i.type === "PASSENGER" && matchesEligibility(i, eligibilityConditions),
  )
  const qty = passengerItems.reduce((sum, i) => sum + Number(i.quantity || 0), 0)
  const value = passengerItems.reduce((sum, i) => {
    const lt = i.lineTotal != null ? Number(i.lineTotal) : Number(i.unitPrice || 0) * Number(i.quantity || 0)
    return sum + lt
  }, 0)
  const avgUnit = qty > 0 ? value / qty : 0
  return { qty, value, avgUnit }
}

function summarizeCargoCart(items, eligibilityConditions = []) {
  const cargoItems = (items || []).filter(
    (i) => i.type === "CARGO" && matchesCargoEligibility(i, eligibilityConditions),
  )
  const qty = cargoItems.reduce((sum, i) => sum + Number(i.quantity || 0), 0)
  const value = cargoItems.reduce((sum, i) => {
    const lt = i.lineTotal != null ? Number(i.lineTotal) : Number(i.unitPrice || 0) * Number(i.quantity || 0)
    return sum + lt
  }, 0)
  const avgUnit = qty > 0 ? value / qty : 0
  return { qty, value, avgUnit }
}

function summarizeVehicleCart(items, eligibilityConditions = []) {
  const vehicleItems = (items || []).filter(
    (i) => i.type === "VEHICLE" && matchesVehicleEligibility(i, eligibilityConditions),
  )
  const qty = vehicleItems.reduce((sum, i) => sum + Number(i.quantity || 0), 0)
  const value = vehicleItems.reduce((sum, i) => {
    const lt = i.lineTotal != null ? Number(i.lineTotal) : Number(i.unitPrice || 0) * Number(i.quantity || 0)
    return sum + lt
  }, 0)
  const avgUnit = qty > 0 ? value / qty : 0
  return { qty, value, avgUnit }
}

function computeContainerDiscount(container, cartSummary) {
  if (!container?.enabled) return { amount: 0, breakdown: [] }
  const { ruleType, quantityRule, totalValueRule } = container
  const breakdown = []
  let amount = 0

  if (ruleType === "QUANTITY" && cartSummary.qty > 0) {
    const { buyX, getY } = quantityRule || {}
    if (buyX >= 1 && getY >= 1) {
      const bundles = Math.floor(cartSummary.qty / buyX)
      const freeCount = bundles * getY
      amount = freeCount * cartSummary.avgUnit
      breakdown.push({ type: "QUANTITY", buyX, getY, bundles, freeCount, unit: cartSummary.avgUnit })
    }
  } else if (ruleType === "TOTAL_VALUE" && cartSummary.value > 0) {
    const { minAmount, discount } = totalValueRule || {}
    if (cartSummary.value >= Number(minAmount || 0) && discount) {
      if (discount.type === "PERCENT") {
        amount = (cartSummary.value * Number(discount.value)) / 100
      } else {
        amount = Math.min(Number(discount.value), cartSummary.value)
      }
      breakdown.push({ type: "TOTAL_VALUE", minAmount, discount })
    }
  }

  return { amount: Math.max(0, Number(amount || 0)), breakdown }
}

function computeDiscountForPromotion(promo, items) {
  const paxSummary = summarizePassengerCart(items, promo.eligibilityConditions || [])
  const pax = computeContainerDiscount(promo.passengerTickets, paxSummary)
  const cargoSummary = summarizeCargoCart(items, promo.cargoEligibilityConditions || [])
  const cargo = computeContainerDiscount(promo.cargoTickets, cargoSummary)
  const vehicleSummary = summarizeVehicleCart(items, promo.vehicleEligibilityConditions || [])
  const vehicle = computeContainerDiscount(promo.vehicleTickets, vehicleSummary)

  const amount = (pax.amount || 0) + (cargo.amount || 0) + (vehicle.amount || 0)
  const breakdown = []
  if (pax.amount > 0) breakdown.push({ category: "PASSENGER", ...pax })
  if (cargo.amount > 0) breakdown.push({ category: "CARGO", ...cargo })
  if (vehicle.amount > 0) breakdown.push({ category: "VEHICLE", ...vehicle })
  return { amount, breakdown }
}

function basisFilter({ basisContext }) {
  const at = basisContext?.at ? new Date(basisContext.at) : new Date()
  const tripId = basisContext?.tripId ? new Types.ObjectId(basisContext.tripId) : null

  const or = [{ basis: "PERIOD", "period.startAt": { $lte: at }, "period.endAt": { $gte: at } }, { basis: "TRIP" }]

  const query = { status: "Active", isDeleted: false, $or: or }
  if (tripId) query.tripId = tripId
  return query
}

async function applyPromotion(payload) {
  const items = payload.cart?.items || []
  const promos = await Promotion.find(basisFilter(payload)).lean()

  let best = null
  for (const p of promos) {
    const result = computeDiscountForPromotion(p, items)
    if (!best || result.amount > best.result.amount) {
      best = { promo: p, result }
    }
  }

  if (!best || best.result.amount <= 0) {
    return { applied: false, discount: 0, reason: "No eligible promotion", candidates: promos.length }
  }

  return {
    applied: true,
    promotionId: best.promo._id,
    name: best.promo.name,
    discount: Number(best.result.amount.toFixed(2)),
    basis: best.promo.basis,
    breakdown: best.result.breakdown,
  }
}

module.exports = {
  listPromotions,
  getPromotionById,
  createPromotion,
  updatePromotion,
  deletePromotion,
  applyPromotion,
}
