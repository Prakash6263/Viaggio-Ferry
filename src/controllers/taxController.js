const createHttpError = require("http-errors")
const { Tax, TAX_STATUS, TAX_TYPE, TAX_FORM } = require("../models/Tax")
const { createTaxWithLedger, softDeleteTax, getTaxesByCompany, getTaxWithLedger } = require("../utils/taxHelper")

/**
 * POST /api/company/taxes
 * Create a new Tax with auto-generated system ledger
 * Body: { code, name, value, type, form, status }
 *
 * LEDGER DESCRIPTION RULE:
 * - Prefer Tax Name (if provided)
 * - Fallback to Tax Code (if Tax Name is not provided)
 * - Ledger description is immutable (cannot be changed later)
 */
const createTax = async (req, res, next) => {
  try {
    const { code, name, value, type, form, status } = req.body
    const companyId = req.companyId

    if (!companyId) {
      throw createHttpError(400, "Company ID is required")
    }

    // Tax Code is required, but Tax Name is optional
    if (!code) {
      throw createHttpError(400, "Tax code is required")
    }

    // Validate enum values
    if (type && !TAX_TYPE.includes(type)) {
      throw createHttpError(400, `Invalid tax type. Allowed: ${TAX_TYPE.join(", ")}`)
    }

    if (form && !TAX_FORM.includes(form)) {
      throw createHttpError(400, `Invalid tax form. Allowed: ${TAX_FORM.join(", ")}`)
    }

    if (status && !TAX_STATUS.includes(status)) {
      throw createHttpError(400, `Invalid status. Allowed: ${TAX_STATUS.join(", ")}`)
    }

    // Create tax with ledger using helper
    const result = await createTaxWithLedger(companyId, { code, name, value, type, form, status })

    res.status(201).json({
      success: true,
      message: "Tax created successfully with system-generated ledger",
      data: {
        tax: result.tax,
        ledger: result.ledger,
        note: "Ledger description is immutable and based on Tax Name (or Tax Code if name not provided)",
      },
    })
  } catch (error) {
    next(error)
  }
}

/**
 * GET /api/company/taxes
 * List all taxes for a company with optional filters
 * Query params: { status, type }
 */
const listTaxes = async (req, res, next) => {
  try {
    const companyId = req.companyId
    const { status, type } = req.query

    if (!companyId) {
      throw createHttpError(400, "Company ID is required")
    }

    const filters = {}
    if (status) filters.status = status
    if (type) filters.type = type

    const taxes = await getTaxesByCompany(companyId, filters)

    res.status(200).json({
      success: true,
      data: taxes,
      count: taxes.length,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * GET /api/company/taxes/:id
 * Get a single tax with its ledger details
 */
const getTaxById = async (req, res, next) => {
  try {
    const { id } = req.params
    const companyId = req.companyId

    if (!companyId) {
      throw createHttpError(400, "Company ID is required")
    }

    const result = await getTaxWithLedger(id, companyId)

    res.status(200).json({
      success: true,
      data: result,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * PUT /api/company/taxes/:id
 * Update a Tax (but NOT its ledger - ledger is system-locked)
 * Body: { name, value, type, form, status }
 *
 * NOTE: Ledger description CANNOT be changed after creation
 * This ensures Chart of Accounts integrity and audit trail
 */
const updateTax = async (req, res, next) => {
  try {
    const { id } = req.params
    const { name, value, type, form, status } = req.body
    const companyId = req.companyId

    if (!companyId) {
      throw createHttpError(400, "Company ID is required")
    }

    // Validate enum values
    if (type && !TAX_TYPE.includes(type)) {
      throw createHttpError(400, `Invalid tax type. Allowed: ${TAX_TYPE.join(", ")}`)
    }

    if (form && !TAX_FORM.includes(form)) {
      throw createHttpError(400, `Invalid tax form. Allowed: ${TAX_FORM.join(", ")}`)
    }

    if (status && !TAX_STATUS.includes(status)) {
      throw createHttpError(400, `Invalid status. Allowed: ${TAX_STATUS.join(", ")}`)
    }

    const tax = await Tax.findOne({
      _id: id,
      company: companyId,
      isDeleted: false,
    })

    if (!tax) {
      throw createHttpError(404, "Tax not found")
    }

    // Update allowed fields only
    if (name !== undefined) tax.name = name.trim()
    if (value !== undefined) {
      if (value < 0) throw createHttpError(400, "Tax value cannot be negative")
      tax.value = value
    }
    if (type !== undefined) tax.type = type
    if (form !== undefined) tax.form = form
    if (status !== undefined) tax.status = status

    await tax.save()

    res.status(200).json({
      success: true,
      message: "Tax updated successfully (ledger description is immutable)",
      data: tax,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * DELETE /api/company/taxes/:id
 * Soft delete a Tax (marks as deleted, preserves ledger)
 * Ledger remains locked and cannot be manually modified or deleted
 */
const deleteTax = async (req, res, next) => {
  try {
    const { id } = req.params
    const companyId = req.companyId

    if (!companyId) {
      throw createHttpError(400, "Company ID is required")
    }

    const tax = await softDeleteTax(id, companyId)

    res.status(200).json({
      success: true,
      message: "Tax deleted successfully (ledger preserved in Chart of Accounts)",
      data: tax,
    })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  createTax,
  listTaxes,
  getTaxById,
  updateTax,
  deleteTax,
}
