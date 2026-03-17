const createHttpError = require("http-errors")
const { Promotion } = require("../models/Promotion")

/**
 * POST /api/promotions
 * Create a new promotion
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
      passengerBenefit,
      cargoBenefit,
      vehicleBenefit,
      serviceBenefits,
    } = req.body

    if (!companyId) throw createHttpError(400, "Company ID is required")

    // Get userId from req.user.id (works for both user and company roles)
    const userId = req.user?.id

    const promotion = new Promotion({
      company: companyId,
      promotionName: promotionName.trim(),
      description: description || "",
      promotionBasis,
      trip: promotionBasis === "Trip" ? trip : null,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      status: status || "Active",
      passengerBenefit: passengerBenefit || { isEnabled: false },
      cargoBenefit: cargoBenefit || { isEnabled: false },
      vehicleBenefit: vehicleBenefit || { isEnabled: false },
      serviceBenefits: serviceBenefits || [],
      createdBy: userId,
    })

    await promotion.save()

    // Populate references for response
    const populatedPromotion = await Promotion.findById(promotion._id)
      .populate("company", "companyName")
      .populate("trip", "tripName tripNumber")
      .populate("createdBy", "email name")
      .populate("updatedBy", "email name")
      .lean()

    res.status(201).json({
      success: true,
      message: "Promotion created successfully",
      data: populatedPromotion,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * GET /api/promotions
 * List all promotions for the company
 */
const listPromotions = async (req, res, next) => {
  try {
    const { companyId } = req
    const { page = 1, limit = 10, search, status, basis } = req.query

    if (!companyId) throw createHttpError(400, "Company ID is required")

    const skip = (page - 1) * limit
    const filter = {
      company: companyId,
      isDeleted: false,
    }

    // Apply filters
    if (search && search.trim().length > 0) {
      filter.promotionName = { $regex: search.trim(), $options: "i" }
    }

    if (status) {
      filter.status = status
    }

    if (basis) {
      filter.promotionBasis = basis
    }

    const promotions = await Promotion.find(filter)
      .populate("company", "companyName")
      .populate("trip", "tripName tripNumber")
      .populate("createdBy", "email name")
      .populate("updatedBy", "email name")
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

/**
 * GET /api/promotions/:id
 * Get a specific promotion
 */
const getPromotionById = async (req, res, next) => {
  try {
    const { id } = req.params
    const { companyId } = req

    if (!companyId) throw createHttpError(400, "Company ID is required")

    const promotion = await Promotion.findOne({
      _id: id,
      company: companyId,
      isDeleted: false,
    })
      .populate("company", "companyName")
      .populate("trip", "tripName tripNumber")
      .populate("createdBy", "email name")
      .populate("updatedBy", "email name")
      .lean()

    if (!promotion) {
      throw createHttpError(404, "Promotion not found")
    }

    res.json({
      success: true,
      data: promotion,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * PUT /api/promotions/:id
 * Update a promotion
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
      passengerBenefit,
      cargoBenefit,
      vehicleBenefit,
      serviceBenefits,
    } = req.body

    if (!companyId) throw createHttpError(400, "Company ID is required")

    // Get userId from req.user.id (works for both user and company roles)
    const userId = req.user?.id

    const promotion = await Promotion.findOne({
      _id: id,
      company: companyId,
    })

    if (!promotion) {
      throw createHttpError(404, "Promotion not found")
    }

    // Update fields if provided
    if (promotionName !== undefined) {
      if (promotionName.trim().length === 0) throw createHttpError(400, "promotionName cannot be empty")
      promotion.promotionName = promotionName.trim()
    }

    if (description !== undefined) promotion.description = description || ""
    if (promotionBasis !== undefined) promotion.promotionBasis = promotionBasis
    if (trip !== undefined) {
      promotion.trip = promotionBasis === "Trip" ? trip : null
    }
    if (startDate !== undefined) promotion.startDate = new Date(startDate)
    if (endDate !== undefined) promotion.endDate = new Date(endDate)
    if (status !== undefined) promotion.status = status

    if (passengerBenefit !== undefined) promotion.passengerBenefit = passengerBenefit
    if (cargoBenefit !== undefined) promotion.cargoBenefit = cargoBenefit
    if (vehicleBenefit !== undefined) promotion.vehicleBenefit = vehicleBenefit
    if (serviceBenefits !== undefined) promotion.serviceBenefits = serviceBenefits

    promotion.updatedBy = userId
    await promotion.save()

    const populatedPromotion = await Promotion.findById(promotion._id)
      .populate("company", "companyName")
      .populate("trip", "tripName tripNumber")
      .populate("createdBy", "email name")
      .populate("updatedBy", "email name")
      .lean()

    res.json({
      success: true,
      message: "Promotion updated successfully",
      data: populatedPromotion,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * DELETE /api/promotions/:id
 * Soft delete a promotion
 */
const deletePromotion = async (req, res, next) => {
  try {
    const { id } = req.params
    const { companyId, userId } = req

    if (!companyId) throw createHttpError(400, "Company ID is required")

    const promotion = await Promotion.findOne({
      _id: id,
      company: companyId,
    })

    if (!promotion) {
      throw createHttpError(404, "Promotion not found")
    }

    // Soft delete
    promotion.isDeleted = true
    promotion.updatedBy = userId
    await promotion.save()

    res.json({
      success: true,
      message: "Promotion deleted successfully",
    })
  } catch (error) {
    next(error)
  }
}

/**
 * GET /api/promotions/active/list
 * Get active promotions (status = Active, no date range filter)
 */
const getActivePromotions = async (req, res, next) => {
  try {
    const { companyId } = req
    const { page = 1, limit = 10 } = req.query

    if (!companyId) throw createHttpError(400, "Company ID is required")

    const skip = (page - 1) * limit

    const filter = {
      company: companyId,
      isDeleted: false,
      status: "Active",
    }

    const promotions = await Promotion.find(filter)
      .populate("company", "companyName")
      .populate("trip", "tripName tripNumber")
      .populate("createdBy", "email name")
      .populate("updatedBy", "email name")
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

/**
 * GET /api/promotions/trip/:tripId
 * Get promotions for a specific trip
 */
const getPromotionsByTripId = async (req, res, next) => {
  try {
    const { tripId } = req.params
    const { companyId } = req
    const { page = 1, limit = 10, status } = req.query

    if (!companyId) throw createHttpError(400, "Company ID is required")
    if (!tripId) throw createHttpError(400, "Trip ID is required")

    const skip = (page - 1) * limit

    const filter = {
      company: companyId,
      trip: tripId,
      isDeleted: false,
    }

    // Optionally filter by status
    if (status) {
      filter.status = status
    }

    const promotions = await Promotion.find(filter)
      .populate("company", "companyName")
      .populate("trip", "tripName tripNumber")
      .populate("createdBy", "email name")
      .populate("updatedBy", "email name")
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
