const createHttpError = require("http-errors")
const { CompanyLedger } = require("../models/CompanyLedger")
const { Tax } = require("../models/Tax")
const { generateLedgerCode } = require("./ledgerHelper")
const { LEDGER_CREATED_BY } = require("../constants/ledgerTypes")

/**
 * LEDGER DESCRIPTION RULE (FINAL & LOCKED):
 * ============================================
 * 1. Ledger Description is derived at creation time ONLY
 * 2. Priority order:
 *    - Prefer: Tax Name (if provided)
 *    - Fallback: Tax Code (if Tax Name is not provided)
 * 3. Ledger Description MUST NOT change later
 * 4. Company CANNOT edit ledger description
 *
 * This rule ensures:
 * - Immutable audit trail for Chart of Accounts
 * - Clear historical reference to original Tax
 * - Prevents accidental breaking of COA integrity
 */
const deriveLedgerDescription = (taxName, taxCode) => {
  // Rule: Prefer Tax Name, fallback to Tax Code
  if (taxName && taxName.trim().length > 0) {
    return taxName.trim()
  }
  return taxCode.trim().toUpperCase()
}

/**
 * Creates a Tax with automatically generated system ledger
 *
 * Flow:
 * 1. Validate input data
 * 2. Check for duplicate tax code within company
 * 3. Generate unique ledger code for "Taxes" type (typeSequence = "36")
 * 4. Derive ledger description (Prefer Tax Name, fallback to Tax Code)
 * 5. Start transaction
 * 6. Create CompanyLedger (systemAccount=true, locked=true, createdBy=system)
 * 7. Create Tax with ledgerId reference
 * 8. Commit transaction
 * 9. Return Tax + Ledger details in response
 *
 * @param {string} companyId - Company ID (multi-tenant isolation)
 * @param {object} taxData - Tax data: { code, name, value, type, form, status }
 * @returns {object} { tax, ledger }
 */
const createTaxWithLedger = async (companyId, { code, name, value, type, form, status }) => {
  // Validate required fields
  if (!companyId || !code || value === undefined || !type) {
    throw createHttpError(400, "Missing required fields: code, value, type (name is optional)")
  }

  // Normalize and validate inputs
  const normalizedCode = code.trim().toUpperCase()
  const normalizedName = name ? name.trim() : null

  if (normalizedCode.length < 1 || normalizedCode.length > 10) {
    throw createHttpError(400, "Tax code must be between 1 and 10 characters")
  }

  if (normalizedName && normalizedName.length > 100) {
    throw createHttpError(400, "Tax name must be between 1 and 100 characters")
  }

  if (value < 0) {
    throw createHttpError(400, "Tax value cannot be negative")
  }

  // Check for duplicate tax code within company
  const existingTax = await Tax.findOne({
    company: companyId,
    code: normalizedCode,
    isDeleted: false,
  })

  if (existingTax) {
    throw createHttpError(409, `Tax code "${normalizedCode}" already exists for this company`)
  }

  // Start MongoDB transaction
  const session = await require("mongoose").startSession()
  session.startTransaction()

  try {
    // Generate ledger code for "Taxes" type (typeSequence = 36)
    const ledgerGen = await generateLedgerCode("Taxes", companyId)

    // Prefer Tax Name, fallback to Tax Code
    const ledgerDescription = deriveLedgerDescription(normalizedName, normalizedCode)

    // Step 1: Create CompanyLedger (system-generated, locked, cannot be deleted)
    const newLedger = new CompanyLedger({
      company: companyId,
      ledgerCode: ledgerGen.ledgerCode,
      ledgerSequenceNumber: ledgerGen.nextSequenceNumber,
      ledgerType: "Taxes",
      typeSequence: ledgerGen.typeSequence,
      ledgerDescription: ledgerDescription, // Set from deriveLedgerDescription rule
      status: status || "Active",
      systemAccount: true, // System-generated ledger
      locked: true, // Cannot be edited or deleted manually
      createdBy: LEDGER_CREATED_BY.SYSTEM,
      notes: `Auto-created for Tax "${normalizedCode}" (${normalizedName || normalizedCode})`,
      isDeleted: false,
    })
    await newLedger.save({ session })

    // Step 2: Create Tax with ledgerId reference
    const newTax = new Tax({
      company: companyId,
      code: normalizedCode,
      name: normalizedName,
      ledgerCode: ledgerGen.ledgerCode,
      value,
      type,
      form: form || "Refundable",
      status: status || "Active",
      isDeleted: false,
    })
    await newTax.save({ session })

    // Commit transaction
    await session.commitTransaction()

    console.log(
      `[v0] Successfully created Tax "${normalizedCode}" (ID: ${newTax._id}) with auto-generated ledger ${ledgerGen.ledgerCode}. Ledger description: "${ledgerDescription}"`,
    )

    return {
      tax: newTax,
      ledger: newLedger,
      message: "Tax created successfully with system-generated ledger",
    }
  } catch (error) {
    // Rollback transaction on any error
    await session.abortTransaction()
    console.error(`[v0] Tax creation failed, transaction rolled back:`, error.message)
    throw error
  } finally {
    await session.endSession()
  }
}

/**
 * Soft delete a Tax (marks as deleted but preserves ledger in CoA)
 * The ledger remains locked and cannot be manually deleted
 */
const softDeleteTax = async (taxId, companyId) => {
  if (!require("mongoose").Types.ObjectId.isValid(taxId)) {
    throw createHttpError(400, "Invalid tax ID format")
  }

  const tax = await Tax.findOne({
    _id: taxId,
    company: companyId,
    isDeleted: false,
  })

  if (!tax) {
    throw createHttpError(404, "Tax not found")
  }

  // Mark as deleted (ledger remains in CoA, locked and systemAccount=true)
  tax.isDeleted = true
  tax.status = "Inactive"
  await tax.save()

  return tax
}

/**
 * Retrieves all active Taxes for a company
 */
const getTaxesByCompany = async (companyId, filters = {}) => {
  const query = {
    company: companyId,
    isDeleted: false,
  }

  if (filters.status) {
    query.status = filters.status
  }

  if (filters.type) {
    query.type = filters.type
  }

  const taxes = await Tax.find(query).sort({ createdAt: -1 })
  return taxes
}

/**
 * Retrieves a single Tax with its ledger details
 */
const getTaxWithLedger = async (taxId, companyId) => {
  if (!require("mongoose").Types.ObjectId.isValid(taxId)) {
    throw createHttpError(400, "Invalid tax ID format")
  }

  const tax = await Tax.findOne({
    _id: taxId,
    company: companyId,
    isDeleted: false,
  })

  if (!tax) {
    throw createHttpError(404, "Tax not found")
  }

  // Fetch ledger details
  const ledger = await CompanyLedger.findOne({
    company: companyId,
    ledgerCode: tax.ledgerCode,
    isDeleted: false,
  })

  return {
    tax,
    ledger: ledger || null,
  }
}

module.exports = {
  createTaxWithLedger,
  softDeleteTax,
  getTaxesByCompany,
  getTaxWithLedger,
  deriveLedgerDescription,
}
