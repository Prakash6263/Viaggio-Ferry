const createHttpError = require("http-errors")
const { PriceList, PRICE_LIST_STATUS, TAX_BASE_OPTIONS, CATEGORY_OPTIONS } = require("../models/PriceList")
const { PriceListDetail, TICKET_TYPE_OPTIONS, TAX_FORM_OPTIONS } = require("../models/PriceListDetail")
const { calculateTotalPrice } = require("../utils/priceCalculator")
const { Tax } = require("../models/Tax")
const CompanyCurrency = require("../models/CompanyCurrency")
const Partner = require("../models/Partner")
const connectDB = require("../config/db")

/**
 * POST /api/price-lists
 * Create price list header WITH ONE detail in single request
 * Body: { 
 *   header: { priceListName, effectiveDateTime, taxBase, currency, category, status },
 *   detail: { passengerType, ticketType, cabin, originPort, destinationPort, visaType, basicPrice, taxIds, taxForm, allowedLuggagePieces, allowedLuggageWeight, excessLuggagePricePerKg }
 * }
 */


const createPriceList = async (req, res, next) => {
  try {
    await connectDB()

    const { header, detail } = req.body
    const companyId = req.companyId
    const userId = req.userId

    if (!companyId) {
      throw createHttpError(400, "Company ID is required")
    }

    // Validate header
    if (!header) {
      throw createHttpError(400, "Header is required")
    }

    const { priceListName, effectiveDateTime, taxBase, currency, category, status, partners } = header

    if (!priceListName) throw createHttpError(400, "Price list name is required")
    if (!effectiveDateTime) throw createHttpError(400, "Effective date/time is required")
    if (!currency) throw createHttpError(400, "Currency ID is required")
    if (!category) throw createHttpError(400, "Category is required")

    if (!CATEGORY_OPTIONS.includes(category)) {
      throw createHttpError(400, `Invalid category. Allowed: ${CATEGORY_OPTIONS.join(", ")}`)
    }

    if (taxBase && !TAX_BASE_OPTIONS.includes(taxBase)) {
      throw createHttpError(400, `Invalid tax base. Allowed: ${TAX_BASE_OPTIONS.join(", ")}`)
    }

    if (status && !PRICE_LIST_STATUS.includes(status)) {
      throw createHttpError(400, `Invalid status. Allowed: ${PRICE_LIST_STATUS.join(", ")}`)
    }

    // Validate currency exists in company's currencies
    const companyCurrency = await CompanyCurrency.findOne({
      _id: currency,
      company: companyId,
      isActive: true,
      isDeleted: false,
    })
    if (!companyCurrency) {
      throw createHttpError(400, "Invalid currency ID. Currency not found for this company")
    }

    // Validate partners if provided
    let validPartners = []
    if (partners && Array.isArray(partners) && partners.length > 0) {
      const partnerRecords = await Partner.find({
        _id: { $in: partners },
        company: companyId,
        layer: "Marine",
        isDeleted: false,
        partnerStatus: "Active",
      })

      if (partnerRecords.length !== partners.length) {
        throw createHttpError(400, "One or more partner IDs not found or not in Marine layer or inactive")
      }
      validPartners = partners
    }

    // Determine creator info from token role
    let createdByInfo = {
      id: req.user.id,
      name: req.user.email,
      type: req.user.role === "company" ? "company" : "user",
    }

    if (req.user.layer) {
      createdByInfo.layer = req.user.layer
    }

    // Create price list header
    const priceList = new PriceList({
      company: companyId,
      priceListName,
      effectiveDateTime,
      taxBase: taxBase || "fare_only",
      currency,
      category,
      status: status || "active",
      partners: validPartners,
      createdBy: createdByInfo,
    })

    await priceList.save()

    // Create detail if provided (ONE detail only)
    let savedDetail = null
    if (detail) {
      const {
        passengerType,
        ticketType,
        cabin,
        originPort,
        destinationPort,
        visaType,
        basicPrice,
        taxIds,
        taxForm,
        allowedLuggagePieces,
        allowedLuggageWeight,
        excessLuggagePricePerKg,
      } = detail

      // Validate detail fields
      if (!passengerType) throw createHttpError(400, "Passenger type is required")
      if (!ticketType) throw createHttpError(400, "Ticket type is required")
      if (!cabin) throw createHttpError(400, "Cabin is required")
      if (!originPort) throw createHttpError(400, "Origin port is required")
      if (!destinationPort) throw createHttpError(400, "Destination port is required")
      if (basicPrice === undefined || basicPrice === null) throw createHttpError(400, "Basic price is required")

      if (!TICKET_TYPE_OPTIONS.includes(ticketType)) {
        throw createHttpError(400, `Invalid ticket type. Allowed: ${TICKET_TYPE_OPTIONS.join(", ")}`)
      }

      if (taxForm && !TAX_FORM_OPTIONS.includes(taxForm)) {
        throw createHttpError(400, `Invalid tax form. Allowed: ${TAX_FORM_OPTIONS.join(", ")}`)
      }

      // Calculate total price
      const detailTaxIds = taxIds && Array.isArray(taxIds) ? taxIds : []
      const totalPrice = await calculateTotalPrice(basicPrice, detailTaxIds, priceList.taxBase, companyId)

      // Create detail
      savedDetail = new PriceListDetail({
        priceList: priceList._id,
        passengerType,
        ticketType,
        cabin,
        originPort,
        destinationPort,
        visaType: visaType || null,
        basicPrice,
        taxIds: detailTaxIds,
        taxForm: taxForm || "refundable",
        allowedLuggagePieces: allowedLuggagePieces || 0,
        allowedLuggageWeight: allowedLuggageWeight || 0,
        excessLuggagePricePerKg: excessLuggagePricePerKg || 0,
        totalPrice,
      })

      await savedDetail.save()
      // Populate detail references
      savedDetail = await PriceListDetail.findById(savedDetail._id)
        .populate({
          path: "passengerType",
          select: "_id name payloadTypeCode",
        })
        .populate({
          path: "cabin",
          select: "_id name cabinCode",
        })
        .populate({
          path: "originPort",
          select: "_id name portCode",
        })
        .populate({
          path: "destinationPort",
          select: "_id name portCode",
        })
        .populate({
          path: "taxIds",
          select: "_id code name value type form status",
        })
    }

    // Populate price list references - explicitly include all fields
    const populatedPriceList = await PriceList.findById(priceList._id)
      .populate({
        path: "currency",
        select: "_id company currencyCode currencyName currentRate isActive",
      })
      .populate({
        path: "partners",
        select: "_id name layer",
      })

    const headerData = populatedPriceList.toObject()
    
    // Ensure partners array is included even if empty
    if (!headerData.partners) {
      headerData.partners = []
    }

    const detailData = savedDetail ? savedDetail.toObject() : null

    res.status(201).json({
      success: true,
      message: "Price list created successfully",
      data: {
        header: headerData,
        detail: detailData,
      },
    })
  } catch (error) {
    next(error)
  }
}

/**
 * GET /api/price-lists
 * List price lists with pagination and filters
 * Query: { page, limit, search, category }
 */


const listPriceLists = async (req, res, next) => {
  try {
    await connectDB()

    const companyId = req.companyId
    const { page = 1, limit = 10, search, category } = req.query

    if (!companyId) {
      throw createHttpError(400, "Company ID is required")
    }

    const skip = (parseInt(page) - 1) * parseInt(limit)
    const filters = {
      company: companyId,
      isDeleted: false,
    }

    if (category) {
      if (!CATEGORY_OPTIONS.includes(category)) {
        throw createHttpError(400, `Invalid category. Allowed: ${CATEGORY_OPTIONS.join(", ")}`)
      }
      filters.category = category
    }

    if (search) {
      filters.$or = [{ priceListName: { $regex: search, $options: "i" } }]
    }

    const total = await PriceList.countDocuments(filters)
    const priceLists = await PriceList.find(filters)
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 })
      .populate({
        path: "currency",
        select: "_id company currencyCode currencyName currentRate isActive",
      })
      .populate({
        path: "partners",
        select: "_id name layer",
      })

    res.status(200).json({
      success: true,
      data: priceLists,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    })
  } catch (error) {
    next(error)
  }
}

/**
 * GET /api/price-lists/:id
 * Get price list header with all details
 */

const getPriceListById = async (req, res, next) => {
  try {
    await connectDB()

    const { id } = req.params
    const companyId = req.companyId

    if (!companyId) {
      throw createHttpError(400, "Company ID is required")
    }

    const priceList = await PriceList.findOne({
      _id: id,
      company: companyId,
      isDeleted: false,
    })
      .populate({
        path: "currency",
        select: "_id company currencyCode currencyName currentRate isActive",
      })
      .populate({
        path: "partners",
        select: "_id name layer",
      })

    if (!priceList) {
      throw createHttpError(404, "Price list not found")
    }

    const details = await PriceListDetail.find({
      priceList: id,
      isDeleted: false,
    })
      .populate({
        path: "passengerType",
        select: "_id name payloadTypeCode",
      })
      .populate({
        path: "cabin",
        select: "_id name cabinCode",
      })
      .populate({
        path: "originPort",
        select: "_id name portCode",
      })
      .populate({
        path: "destinationPort",
        select: "_id name portCode",
      })
      .populate({
        path: "taxIds",
        select: "_id code name value type form status",
      })

    res.status(200).json({
      success: true,
      data: {
        header: priceList.toObject(),
        details: details.map(d => d.toObject()),
      },
    })
  } catch (error) {
    next(error)
  }
}

/**
 * PUT /api/price-lists/:id
 * Update price list header only
 * Body: { priceListName, effectiveDateTime, taxBase, currency, status }
 */

const updatePriceList = async (req, res, next) => {
  try {
    await connectDB()

    const { id } = req.params
    const { priceListName, effectiveDateTime, taxBase, currency, status, partners } = req.body
    const companyId = req.companyId
    const userId = req.userId

    if (!companyId) {
      throw createHttpError(400, "Company ID is required")
    }

    const priceList = await PriceList.findOne({
      _id: id,
      company: companyId,
      isDeleted: false,
    })

    if (!priceList) {
      throw createHttpError(404, "Price list not found")
    }

    // Update header fields if provided
    if (priceListName) priceList.priceListName = priceListName.trim()
    if (effectiveDateTime) priceList.effectiveDateTime = effectiveDateTime
    if (taxBase) {
      if (!TAX_BASE_OPTIONS.includes(taxBase)) {
        throw createHttpError(400, `Invalid tax base. Allowed: ${TAX_BASE_OPTIONS.join(", ")}`)
      }
      priceList.taxBase = taxBase
    }
    if (currency) {
      const companyCurrency = await CompanyCurrency.findOne({
        _id: currency,
        company: companyId,
        isActive: true,
        isDeleted: false,
      })
      if (!companyCurrency) {
        throw createHttpError(400, "Invalid currency ID. Currency not found for this company")
      }
      priceList.currency = currency
    }
    if (status) {
      if (!PRICE_LIST_STATUS.includes(status)) {
        throw createHttpError(400, `Invalid status. Allowed: ${PRICE_LIST_STATUS.join(", ")}`)
      }
      priceList.status = status
    }

    // Update partners if provided
    if (partners !== undefined) {
      if (Array.isArray(partners) && partners.length > 0) {
        const partnerRecords = await Partner.find({
          _id: { $in: partners },
          company: companyId,
          layer: "Marine",
          isDeleted: false,
          partnerStatus: "Active",
        })

        if (partnerRecords.length !== partners.length) {
          throw createHttpError(400, "One or more partner IDs not found or not in Marine layer or inactive")
        }
        priceList.partners = partners
      } else {
        priceList.partners = []
      }
    }

    // Update updatedBy
    priceList.updatedBy = {
      id: req.user.id,
      name: req.user.email,
      type: req.user.role === "company" ? "company" : "user",
    }

    if (req.user.layer) {
      priceList.updatedBy.layer = req.user.layer
    }

    await priceList.save()

    const updatedPriceList = await PriceList.findById(priceList._id)
      .populate({
        path: "currency",
        select: "_id company currencyCode currencyName currentRate isActive",
      })
      .populate({
        path: "partners",
        select: "_id name layer",
      })

    res.status(200).json({
      success: true,
      message: "Price list updated successfully",
      data: updatedPriceList,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * DELETE /api/price-lists/:id
 * Soft delete price list
 */

const deletePriceList = async (req, res, next) => {
  try {
    await connectDB()

    const { id } = req.params
    const companyId = req.companyId

    if (!companyId) {
      throw createHttpError(400, "Company ID is required")
    }

    const priceList = await PriceList.findOne({
      _id: id,
      company: companyId,
      isDeleted: false,
    })

    if (!priceList) {
      throw createHttpError(404, "Price list not found")
    }

    // Soft delete
    priceList.isDeleted = true
    await priceList.save()

    // Soft delete all details
    await PriceListDetail.updateMany({ priceList: id }, { isDeleted: true })

    res.status(200).json({
      success: true,
      message: "Price list deleted successfully",
    })
  } catch (error) {
    next(error)
  }
}

/**
 * POST /api/price-lists/:id/details
 * Add single detail to price list
 * Body: { passengerType, ticketType, cabin, originPort, destinationPort, visaType, basicPrice, taxIds, taxForm, allowedLuggagePieces, allowedLuggageWeight, excessLuggagePricePerKg }
 */

const addPriceListDetail = async (req, res, next) => {
  try {
    await connectDB()

    const { id } = req.params
    const companyId = req.companyId
    const {
      passengerType,
      ticketType,
      cabin,
      originPort,
      destinationPort,
      visaType,
      basicPrice,
      taxIds,
      taxForm,
      allowedLuggagePieces,
      allowedLuggageWeight,
      excessLuggagePricePerKg,
    } = req.body

    if (!companyId) {
      throw createHttpError(400, "Company ID is required")
    }

    // Verify price list exists and belongs to company
    const priceList = await PriceList.findOne({
      _id: id,
      company: companyId,
      isDeleted: false,
    })

    if (!priceList) {
      throw createHttpError(404, "Price list not found")
    }

    // Validate required fields
    if (!passengerType) throw createHttpError(400, "Passenger type is required")
    if (!ticketType) throw createHttpError(400, "Ticket type is required")
    if (!cabin) throw createHttpError(400, "Cabin is required")
    if (!originPort) throw createHttpError(400, "Origin port is required")
    if (!destinationPort) throw createHttpError(400, "Destination port is required")
    if (basicPrice === undefined || basicPrice === null) throw createHttpError(400, "Basic price is required")

    if (!TICKET_TYPE_OPTIONS.includes(ticketType)) {
      throw createHttpError(400, `Invalid ticket type. Allowed: ${TICKET_TYPE_OPTIONS.join(", ")}`)
    }

    if (taxForm && !TAX_FORM_OPTIONS.includes(taxForm)) {
      throw createHttpError(400, `Invalid tax form. Allowed: ${TAX_FORM_OPTIONS.join(", ")}`)
    }

    // Calculate total price
    const detailTaxIds = taxIds && Array.isArray(taxIds) ? taxIds : []
    const totalPrice = await calculateTotalPrice(basicPrice, detailTaxIds, priceList.taxBase, companyId)

    // Create detail
    const detail = new PriceListDetail({
      priceList: priceList._id,
      passengerType,
      ticketType,
      cabin,
      originPort,
      destinationPort,
      visaType: visaType || null,
      basicPrice,
      taxIds: detailTaxIds,
      taxForm: taxForm || "refundable",
      allowedLuggagePieces: allowedLuggagePieces || 0,
      allowedLuggageWeight: allowedLuggageWeight || 0,
      excessLuggagePricePerKg: excessLuggagePricePerKg || 0,
      totalPrice,
      isDisabled: false, // Always set to false on creation
    })

    await detail.save()

    res.status(201).json({
      success: true,
      message: "Price list detail added successfully",
      data: await PriceListDetail.findById(detail._id)
        .populate("passengerType")
        .populate("cabin")
        .populate("originPort")
        .populate("destinationPort")
        .populate("taxIds"),
    })
  } catch (error) {
    // Let global error handler catch E11000 errors
    next(error)
  }
}

/**
 * PUT /api/price-lists/:id/partners
 * Assign multiple partners to price list (Marine layer only)
 * Body: { partnerIds: [array of partner IDs] }
 */

const assignPartners = async (req, res, next) => {
  try {
    await connectDB()

    const { id } = req.params
    const { partnerIds } = req.body
    const companyId = req.companyId

    if (!companyId) {
      throw createHttpError(400, "Company ID is required")
    }

    // Get price list
    const priceList = await PriceList.findOne({
      _id: id,
      company: companyId,
      isDeleted: false,
    })

    if (!priceList) {
      throw createHttpError(404, "Price list not found")
    }

    // Validate partnerIds is an array
    if (!Array.isArray(partnerIds)) {
      throw createHttpError(400, "Partner IDs must be an array")
    }

    // Validate all partners exist and belong to Marine layer
    const partners = await Partner.find({
      _id: { $in: partnerIds },
      company: companyId,
      layer: "Marine",
      isDeleted: false,
      partnerStatus: "Active",
    })

    if (partners.length !== partnerIds.length) {
      throw createHttpError(400, "One or more partner IDs not found or not in Marine layer or inactive")
    }

    // Assign partners
    priceList.partners = partnerIds
    priceList.updatedBy = {
      id: req.user.id,
      name: req.user.email,
      type: req.user.role === "company" ? "company" : "user",
    }

    if (req.user.layer) {
      priceList.updatedBy.layer = req.user.layer
    }

    await priceList.save()

    const updatedPriceList = await PriceList.findById(priceList._id)
      .populate("currency")
      .populate("partners")

    res.status(200).json({
      success: true,
      message: "Partners assigned successfully",
      data: updatedPriceList,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * PATCH /api/price-lists/details/:detailId/disable
 * Permanently disable a price list detail (irreversible)
 */
const disablePriceListDetail = async (req, res, next) => {
  try {
    await connectDB()

    const { detailId } = req.params
    const companyId = req.companyId

    if (!companyId) {
      throw createHttpError(400, "Company ID is required")
    }

    // Find detail
    const detail = await PriceListDetail.findById(detailId)

    if (!detail) {
      throw createHttpError(404, "Detail not found")
    }

    // Verify the detail belongs to a price list in this company
    const priceList = await PriceList.findOne({
      _id: detail.priceList,
      company: companyId,
    })

    if (!priceList) {
      throw createHttpError(403, "You do not have permission to modify this detail")
    }

    // Check if already disabled
    if (detail.isDisabled === true) {
      throw createHttpError(400, "Detail already disabled. This action is irreversible.")
    }

    // Disable the detail
    detail.isDisabled = true
    await detail.save()

    res.status(200).json({
      success: true,
      message: "Detail permanently disabled. This action cannot be undone.",
      data: detail,
    })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  createPriceList,
  listPriceLists,
  getPriceListById,
  updatePriceList,
  deletePriceList,
  addPriceListDetail,
  disablePriceListDetail,
}
