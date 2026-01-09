const createHttpError = require("http-errors")
const { CompanyLedger } = require("../models/CompanyLedger")
const { BankCashAccount } = require("../models/BankCashAccount")
const Partner = require("../models/Partner")
const CompanyCurrency = require("../models/CompanyCurrency")
const { generateLedgerCode } = require("./ledgerHelper")
const { LEDGER_TYPE_MAPPING, LEDGER_CREATED_BY } = require("../constants/ledgerTypes")

/**
 * Atomically creates a Bank/Cash Account with auto-generated ledger
 * Flow:
 * 1. Validate input data
 * 2. Validate partner reference (if provided)
 * 3. Validate currency reference (CompanyCurrency)
 * 4. Generate unique ledger code for "Cash & Banks" type
 * 5. Start transaction
 * 6. Create CompanyLedger (systemAccount=true, locked=true, createdBy=system)
 * 7. Create BankCashAccount with ledgerId reference
 * 8. Commit transaction
 * 9. Handle rollback on any error
 */
const createBankCashAccountWithLedger = async (
  companyId,
  { layer, partnerAccountId, accountType, accountName, bankAccountNo, currencyId, status, note },
) => {
  // Validate required fields
  if (!companyId || !layer || !accountType || !accountName || !currencyId) {
    throw createHttpError(400, "Missing required fields: companyId, layer, accountType, accountName, currencyId")
  }

  // Validate accountName uniqueness (read-only check before transaction)
  const existingAccount = await BankCashAccount.findOne({
    company: companyId,
    accountName,
    isDeleted: false,
  })
  if (existingAccount) {
    throw createHttpError(409, `Bank/Cash Account with name "${accountName}" already exists in this company`)
  }

  if (!require("mongoose").Types.ObjectId.isValid(currencyId)) {
    throw createHttpError(400, "Invalid currency ID format")
  }

  const companyCurrency = await CompanyCurrency.findOne({
    _id: currencyId,
    company: companyId,
    isDeleted: false,
  })
  if (!companyCurrency) {
    throw createHttpError(404, "Currency not found or not configured for this company")
  }

  // Validate partner reference if provided
  if (partnerAccountId) {
    const partner = await Partner.findById(partnerAccountId)
    if (!partner || partner.company.toString() !== companyId.toString()) {
      throw createHttpError(404, "Partner Account not found or does not belong to this company")
    }
  }

  // Start MongoDB session for transaction
  const session = await require("mongoose").startSession()
  session.startTransaction()

  try {
    // Generate ledger code for "Cash & Banks" type (typeSequence = 21)
    const ledgerGen = await generateLedgerCode("Cash & Banks", companyId)

    // Step 1: Create CompanyLedger (system-generated, locked)
    const newLedger = new CompanyLedger({
      company: companyId,
      ledgerCode: ledgerGen.ledgerCode,
      ledgerSequenceNumber: ledgerGen.nextSequenceNumber,
      ledgerType: "Cash & Banks",
      typeSequence: ledgerGen.typeSequence,
      ledgerDescription: `Bank/Cash: ${accountName}`,
      status: status || "Active",
      systemAccount: true,
      locked: true,
      createdBy: LEDGER_CREATED_BY.SYSTEM,
      partnerAccount: partnerAccountId || null,
      partnerModel: partnerAccountId ? "Partner" : "N/A",
      notes: `Auto-created for Bank/Cash Account "${accountName}" in ${companyCurrency.currencyCode}`,
      isDeleted: false,
    })
    await newLedger.save({ session })

    // Step 2: Create BankCashAccount with ledgerId reference
    const newAccount = new BankCashAccount({
      company: companyId,
      layer,
      partnerAccount: partnerAccountId || null,
      accountType,
      accountName,
      bankAccountNo: bankAccountNo || "N/A",
      currency: currencyId, // CompanyCurrency reference
      ledgerId: newLedger._id,
      ledgerCode: ledgerGen.ledgerCode,
      status: status || "Active",
      note: note || "",
      isDeleted: false,
    })
    await newAccount.save({ session })

    // Commit transaction
    await session.commitTransaction()
    console.log(
      `[v0] Successfully created Bank/Cash Account "${accountName}" (ID: ${newAccount._id}) with auto-generated ledger ${ledgerGen.ledgerCode}`,
    )

    return {
      account: newAccount,
      ledger: newLedger,
    }
  } catch (error) {
    // Rollback transaction on any error
    await session.abortTransaction()
    console.error(`[v0] Bank/Cash Account creation failed, transaction rolled back:`, error.message)
    throw error
  } finally {
    await session.endSession()
  }
}

/**
 * Soft delete a Bank/Cash Account (marks as deleted but preserves ledger in CoA)
 */
const softDeleteBankCashAccount = async (accountId, companyId) => {
  if (!require("mongoose").Types.ObjectId.isValid(accountId)) {
    throw createHttpError(400, "Invalid account ID format")
  }

  const account = await BankCashAccount.findOne({
    _id: accountId,
    company: companyId,
    isDeleted: false,
  })

  if (!account) {
    throw createHttpError(404, "Bank/Cash Account not found")
  }

  // Mark as deleted (ledger remains in CoA, locked and systemAccount=true)
  account.isDeleted = true
  account.status = "Inactive"
  await account.save()

  return account
}

module.exports = {
  createBankCashAccountWithLedger,
  softDeleteBankCashAccount,
}
