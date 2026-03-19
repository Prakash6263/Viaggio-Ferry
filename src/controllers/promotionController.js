const createHttpError = require("http-errors")
const { Promotion } = require("../models/Promotion")

/**
 * Helper: build populate chain used by all queries
 */
function buildPopulate(query) {
  return query
    .populate("company", "companyName")
    .populate("trip", "tripName tripNumber")
    // Passenger eligibility: passengerTypeId + cabinId
    .populate({
      path: "servicePromotions.passenger.eligibility.passengerTypeId",
      select: "name code category",
    })
    .populate({
      path: "servicePromotions.passenger.eligibility.cabinId",
      select: "name type description",
    })
    // Cargo eligibility: payloadId
    .populate({
      path: "servicePromotions.cargo.eligibility.payloadId",
      select: "name code category",
    })
    // Vehicle eligibility: payloadId
    .populate({
      path: "servicePromotions.vehicle.eligibility.payloadId",
      select: "name code category",
    })
}

/**
 * Helper: build audit trail object
 */
function buildAuditTrail(req) {
  return {
    id: req.user?.id,
    name: req.user?.email,
    type: req.user?.role === "company" ? "company" : "user",
  }
}

// ─── CREATE ───────────────────────────────────────────────────────────
/**
 * POST /api/promotions
 */
const createPromotion = async (req, res, next) => {
  try {
    const { companyId } = req
    const {
      promotionName,
      description,
      promotionBasis,
      trip,
      startDate,
      endDate,
      status,
      servicePromotions,
    } = req.body

    if (!companyId) throw createHttpError(400, "Company ID is required")

    // Debug: log incoming servicePromotions
    console.log("[v0] createPromotion - incoming servicePromotions:", JSON.stringify(servicePromotions, null, 2))

    const promotion = new Promotion({
      company: companyId,
      promotionName: promotionName.trim(),
      description: description || "",
      promotionBasis,
      trip: promotionBasis === "Trip" ? trip : null,
      // startDate/endDate only for Period-based promotions
      startDate: promotionBasis === "Period" && startDate ? new Date(startDate) : null,
      endDate: promotionBasis === "Period" && endDate ? new Date(endDate) : null,
      status: status || "Active",
      servicePromotions: servicePromotions || {},
      createdBy: buildAuditTrail(req),
    })

    // Debug: log promotion object before save
    console.log("[v0] createPromotion - promotion.servicePromotions before save:", JSON.stringify(promotion.servicePromotions, null, 2))

    await promotion.save()

    // Debug: log promotion object after save
    console.log("[v0] createPromotion - promotion.servicePromotions after save:", JSON.stringify(promotion.servicePromotions, null, 2))

    const populated = await buildPopulate(
      Promotion.findById(promotion._id),
    ).lean()

    res.status(201).json({
      success: true,
      message: "Promotion created successfully",
      data: populated,
    })
  } catch (error) {
    next(error)
  }
}

// ─── LIST ─────────────────────────────────────────────────────────────
/**
 * GET /api/promotions
 */
const listPromotions = async (req, res, next) => {
  try {
    const { companyId } = req
    const { page = 1, limit = 10, search, status, basis } = req.query

    if (!companyId) throw createHttpError(400, "Company ID is required")

    const skip = (page - 1) * limit
    const filter = { company: companyId, isDeleted: false }

    if (search && search.trim().length > 0) {
      filter.promotionName = { $regex: search.trim(), $options: "i" }
    }
    if (status) filter.status = status
    if (basis) filter.promotionBasis = basis

    const promotions = await buildPopulate(Promotion.find(filter))
      .skip(skip)
      .limit(Number.parseInt(limit))
      .sort({ createdAt: -1 })
      .lean()

    const total = await Promotion.countDocuments(filter)

    res.json({
      success: true,
      data: promotions,
      pagination: {
        page: Number.parseInt(page),
        limit: Number.parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    next(error)
  }
}

// ─── GET BY ID ────────────────────────────────────────────────────────
/**
 * GET /api/promotions/:id
 */
const getPromotionById = async (req, res, next) => {
  try {
    const { id } = req.params
    const { companyId } = req

    if (!companyId) throw createHttpError(400, "Company ID is required")

    const promotion = await buildPopulate(
      Promotion.findOne({ _id: id, company: companyId, isDeleted: false }),
    ).lean()

    if (!promotion) throw createHttpError(404, "Promotion not found")

    res.json({ success: true, data: promotion })
  } catch (error) {
    next(error)
  }
}

// ─── UPDATE ───────────────────────────────────────────────────────────
/**
 * PUT /api/promotions/:id
 */
const updatePromotion = async (req, res, next) => {
  try {
    const { id } = req.params
    const { companyId } = req
    const {
      promotionName,
      description,
      promotionBasis,
      trip,
      startDate,
      endDate,
      status,
      servicePromotions,
    } = req.body

    if (!companyId) throw createHttpError(400, "Company ID is required")

    const promotion = await Promotion.findOne({ _id: id, company: companyId })
    if (!promotion) throw createHttpError(404, "Promotion not found")

    // Update scalar fields when provided
    if (promotionName !== undefined) {
      if (promotionName.trim().length === 0) throw createHttpError(400, "promotionName cannot be empty")
      promotion.promotionName = promotionName.trim()
    }
    if (description !== undefined) promotion.description = description || ""
    if (promotionBasis !== undefined) promotion.promotionBasis = promotionBasis
    if (trip !== undefined) {
      promotion.trip = (promotionBasis || promotion.promotionBasis) === "Trip" ? trip : null
    }
    if (startDate !== undefined) promotion.startDate = new Date(startDate)
    if (endDate !== undefined) promotion.endDate = new Date(endDate)
    if (status !== undefined) promotion.status = status

    // Update service promotions
    if (servicePromotions !== undefined) {
      promotion.servicePromotions = servicePromotions
    }

    promotion.updatedBy = buildAuditTrail(req)
    await promotion.save()

    const populated = await buildPopulate(
      Promotion.findById(promotion._id),
    ).lean()

    res.json({
      success: true,
      message: "Promotion updated successfully",
      data: populated,
    })
  } catch (error) {
    next(error)
  }
}

// ─── DELETE (soft) ────────────────────────────────────────────────────
/**
 * DELETE /api/promotions/:id
 */
const deletePromotion = async (req, res, next) => {
  try {
    const { id } = req.params
    const { companyId } = req

    if (!companyId) throw createHttpError(400, "Company ID is required")

    const promotion = await Promotion.findOne({ _id: id, company: companyId })
    if (!promotion) throw createHttpError(404, "Promotion not found")

    promotion.isDeleted = true
    promotion.updatedBy = buildAuditTrail(req)
    await promotion.save()

    res.json({ success: true, message: "Promotion deleted successfully" })
  } catch (error) {
    next(error)
  }
}

// ─── ACTIVE LIST ──────────────────────────────────────────────────────
/**
 * GET /api/promotions/active/list
 */
const getActivePromotions = async (req, res, next) => {
  try {
    const { companyId } = req
    const { page = 1, limit = 10 } = req.query

    if (!companyId) throw createHttpError(400, "Company ID is required")

    const now = new Date()
    const skip = (page - 1) * limit

    // Active promotions are either:
    // 1. Trip-based: status is Active (validity tied to trip)
    // 2. Period-based: status is Active AND current date is within startDate/endDate
    const filter = {
      company: companyId,
      isDeleted: false,
      status: "Active",
      $or: [
        // Trip-based promotions (no date constraints)
        { promotionBasis: "Trip" },
        // Period-based promotions (date must be within range)
        {
          promotionBasis: "Period",
          startDate: { $lte: now },
          endDate: { $gte: now },
        },
      ],
    }

    const promotions = await buildPopulate(Promotion.find(filter))
      .skip(skip)
      .limit(Number.parseInt(limit))
      .sort({ createdAt: -1 })
      .lean()

    const total = await Promotion.countDocuments(filter)

    res.json({
      success: true,
      data: promotions,
      pagination: {
        page: Number.parseInt(page),
        limit: Number.parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    next(error)
  }
}

// ─── BY TRIP ──────────────────────────────────────────────────────────
/**
 * GET /api/promotions/trip/:tripId
 */
const getPromotionsByTripId = async (req, res, next) => {
  try {
    const { tripId } = req.params
    const { companyId } = req
    const { page = 1, limit = 10, status } = req.query

    if (!companyId) throw createHttpError(400, "Company ID is required")
    if (!tripId) throw createHttpError(400, "Trip ID is required")

    const skip = (page - 1) * limit
    const filter = { company: companyId, trip: tripId, isDeleted: false }
    if (status) filter.status = status

    const promotions = await buildPopulate(Promotion.find(filter))
      .skip(skip)
      .limit(Number.parseInt(limit))
      .sort({ createdAt: -1 })
      .lean()

    const total = await Promotion.countDocuments(filter)

    res.json({
      success: true,
      data: promotions,
      pagination: {
        page: Number.parseInt(page),
        limit: Number.parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  createPromotion,
  listPromotions,
  getPromotionById,
  updatePromotion,
  deletePromotion,
  getActivePromotions,
  getPromotionsByTripId,
}
