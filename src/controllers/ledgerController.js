const createHttpError = require("http-errors")
const { SuperAdminLedger } = require("../models/SuperAdminLedger")
const { CompanyLedger } = require("../models/CompanyLedger")
const Company = require("../models/Company")
const Partner = require("../models/Partner")
const {
  LEDGER_TYPES,
  LEDGER_TYPE_MAPPING,
  SYSTEM_ONLY_LEDGER_TYPES,
  COMPANY_ALLOWED_LEDGER_TYPES,
  LEDGER_CREATED_BY,
} = require("../constants/ledgerTypes")
const { generateLedgerCode } = require("../utils/ledgerHelper")

// POST /api/admin/ledgers
// Create a new ledger
const createLedger = async (req, res, next) => {
  try {
    const { companyId, ledgerType, status, notes } = req.body
    const userRole = req.user?.role

    // Improved error handling to include allowed ledger types when validation fails
    if (ledgerType && !LEDGER_TYPES.includes(ledgerType)) {
      const error = createHttpError(400, `Invalid ledgerType: "${ledgerType}". Please use one of the allowed types.`)
      error.details = { allowedTypes: LEDGER_TYPES }
      throw error
    }

    const isBaseLedgerCreation = !companyId

    if (isBaseLedgerCreation) {
      // Confirm only SUPERADMIN can create base ledgers
      if (userRole !== "super_admin") {
        throw createHttpError(403, "Only SUPERADMIN can create base ledgers")
      }

      if (!ledgerType) {
        throw createHttpError(400, "ledgerType is required for base ledgers")
      }

      const existingBase = await SuperAdminLedger.findOne({
        ledgerType,
        isDeleted: false,
      })
      if (existingBase) throw createHttpError(400, "Base ledger already exists")

      const gen = await generateLedgerCode(ledgerType)
      const newLedger = new SuperAdminLedger({
        ledgerCode: gen.ledgerCode,
        ledgerSequenceNumber: gen.nextSequenceNumber,
        ledgerType,
        typeSequence: gen.typeSequence,
        status: status || "Active",
        notes,
        createdBy: LEDGER_CREATED_BY.SUPER_ADMIN,
      })
      await newLedger.save()

      return res.status(201).json({ success: true, message: "Base ledger created", data: newLedger })
    } else {
      // Company Ledger Creation
      if (!companyId || !ledgerType) {
        throw createHttpError(400, "companyId and ledgerType are required")
      }

      if (SYSTEM_ONLY_LEDGER_TYPES.includes(ledgerType)) {
        throw createHttpError(403, `Manual creation of ${ledgerType} is forbidden. System-generated only.`)
      }

      // Rule 7: Companies can only create limited expense-type ledgers
      if (userRole === "company" && !COMPANY_ALLOWED_LEDGER_TYPES.includes(ledgerType)) {
        throw createHttpError(403, `Companies can only create: ${COMPANY_ALLOWED_LEDGER_TYPES.join(", ")}`)
      }

      const company = await Company.findById(companyId)
      if (!company) throw createHttpError(404, "Company not found")

      const gen = await generateLedgerCode(ledgerType, companyId)
      const newLedger = new CompanyLedger({
        company: companyId,
        ledgerCode: gen.ledgerCode,
        ledgerSequenceNumber: gen.nextSequenceNumber,
        ledgerType,
        typeSequence: gen.typeSequence,
        status: status || "Active",
        notes,
        systemAccount: false,
        locked: false,
        createdBy: userRole === "super_admin" ? LEDGER_CREATED_BY.SUPER_ADMIN : LEDGER_CREATED_BY.COMPANY,
      })
      await newLedger.save()

      res.status(201).json({ success: true, message: "Company ledger created", data: newLedger })
    }
  } catch (error) {
    next(error)
  }
}

// POST /api/company/ledgers
// Create a new ledger for company (with all fields including partnerAccount)
const createCompanyLedger = async (req, res, next) => {
  try {
    const userRole = req.user?.role
    const tokenCompanyId = req.user?.companyId || req.user?.id

    const {
      ledgerType,
      ledgerDescription,
      typeSequence,
      ledgerCode,
      status,
      partnerAccount,
      systemAccount = false,
      notes,
    } = req.body

    // Only company users can create ledgers (or super_admin)
    if (userRole !== "company" && userRole !== "super_admin") {
      throw createHttpError(403, "Only company users can create ledgers")
    }

    // Validate required fields
    if (!ledgerType) {
      throw createHttpError(400, "ledgerType is required")
    }

    if (!typeSequence) {
      throw createHttpError(400, "typeSequence is required")
    }

    // Validate ledgerType is allowed
    if (!LEDGER_TYPES.includes(ledgerType)) {
      throw createHttpError(400, `Invalid ledgerType: "${ledgerType}". Please use one of the allowed types.`)
    }

    // Prevent manual creation of system-only ledger types
    if (SYSTEM_ONLY_LEDGER_TYPES.includes(ledgerType)) {
      throw createHttpError(403, `Manual creation of ${ledgerType} is forbidden. System-generated only.`)
    }

    // Companies can only create limited expense-type ledgers
    if (userRole === "company" && !COMPANY_ALLOWED_LEDGER_TYPES.includes(ledgerType)) {
      throw createHttpError(403, `Companies can only create: ${COMPANY_ALLOWED_LEDGER_TYPES.join(", ")}`)
    }

    const company = await Company.findById(tokenCompanyId)
    if (!company) throw createHttpError(404, "Company not found")

    let finalLedgerCode = ledgerCode
    if (!finalLedgerCode) {
      const gen = await generateLedgerCode(ledgerType, tokenCompanyId)
      finalLedgerCode = gen.ledgerCode
    }

    // Check for duplicate ledger code within company
    const existingLedger = await CompanyLedger.findOne({
      company: tokenCompanyId,
      ledgerCode: finalLedgerCode,
      isDeleted: false,
    })
    if (existingLedger) {
      throw createHttpError(400, `Ledger code ${finalLedgerCode} already exists for this company`)
    }

    // Validate partnerAccount if provided
    let partnerModel = "N/A"
    if (partnerAccount) {
      const partner = await Partner.findById(partnerAccount)
      if (!partner) {
        throw createHttpError(404, "Partner not found")
      }
      if (partner.company.toString() !== tokenCompanyId) {
        throw createHttpError(403, "Partner must belong to the same company")
      }
      partnerModel = "Partner"
    }

    const newLedger = new CompanyLedger({
      company: tokenCompanyId,
      ledgerCode: finalLedgerCode,
      ledgerType,
      typeSequence,
      ledgerDescription: ledgerDescription || "",
      status: status || "Active",
      systemAccount,
      locked: false,
      createdBy: "company",
      partnerAccount: partnerAccount || null,
      partnerModel,
      notes: notes || "",
    })

    await newLedger.save()

    res.status(201).json({
      success: true,
      message: "Company ledger created successfully",
      data: newLedger,
    })
  } catch (error) {
    next(error)
  }
}

// GET /api/admin/ledgers
// List ledgers with filtering (Rule 5: Handles separate schemas)
const listLedgers = async (req, res, next) => {
  try {
    const { companyId, status, page = 1, limit = 50 } = req.query

    // but default to their own if no specific query is provided.
    // If a company user is logged in, they can see their own ledgers.
    // If they want to see base ledgers, they'd typically be accessed via the super admin route.
    const targetCompanyId = companyId || (req.user?.role === "company" ? req.user.companyId : null)

    const skip = (page - 1) * limit
    const filter = { isDeleted: false }

    if (status) filter.status = status

    let Model = SuperAdminLedger
    if (targetCompanyId) {
      filter.company = targetCompanyId
      Model = CompanyLedger
    }

    const query = Model.find(filter).skip(skip).limit(Number(limit)).sort({ ledgerCode: 1 })

    if (Model === CompanyLedger) {
      query.populate("company", "companyName")
      query.populate({
        path: "partnerAccount",
        model: "Partner",
        select: "name",
      })
    }

    const ledgers = await query

    const total = await Model.countDocuments(filter)

    res.json({
      success: true,
      data: ledgers,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) },
    })
  } catch (error) {
    next(error)
  }
}

// GET /api/admin/ledgers/allowed-types
// Retrieve allowed ledger types
const getAllowedLedgerTypes = async (req, res, next) => {
  try {
    const allowedTypes = LEDGER_TYPES.map((type) => ({
      label: type,
      value: type,
      typeSequence: LEDGER_TYPE_MAPPING[type] || null,
      systemOnly: SYSTEM_ONLY_LEDGER_TYPES.includes(type),
    }))

    res.json({
      success: true,
      message: "Allowed ledger types retrieved",
      data: allowedTypes,
    })
  } catch (error) {
    next(error)
  }
}

// DELETE /api/admin/ledgers/:id
// Soft delete a ledger (sets isDeleted to true)
const deleteLedger = async (req, res, next) => {
  try {
    const { id } = req.params
    const { companyId } = req.query

    // Determine which model to use based on companyId
    const Model = companyId ? CompanyLedger : SuperAdminLedger
    const filter = { _id: id, isDeleted: false }

    if (companyId) {
      filter.company = companyId
    }

    // Find and soft delete the ledger
    const ledger = await Model.findOne(filter)
    if (!ledger) {
      throw createHttpError(404, "Ledger not found")
    }

    // Prevent deletion of locked system accounts
    if (ledger.locked) {
      throw createHttpError(403, "Cannot delete locked system ledgers")
    }

    ledger.isDeleted = true
    await ledger.save()

    res.json({
      success: true,
      message: "Ledger deleted successfully",
      data: ledger,
    })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  createLedger,
  createCompanyLedger,
  getAllowedLedgerTypes,
  listLedgers,
  deleteLedger,
}
