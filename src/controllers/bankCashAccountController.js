const createHttpError = require("http-errors")
const mongoose = require("mongoose")
const { BankCashAccount } = require("../models/BankCashAccount")
const { createBankCashAccountWithLedger, softDeleteBankCashAccount } = require("../utils/bankCashAccountHelper")
const Company = require("../models/Company")
const Partner = require("../models/Partner")
const CompanyCurrency = require("../models/CompanyCurrency")

/**
 * POST /api/company/bank-cash-accounts
 * Create a new Bank/Cash Account with atomic ledger creation
 */
const createBankCashAccount = async (req, res, next) => {
  try {
    const userRole = req.user?.role
    const tokenCompanyId = req.user?.companyId || req.user?.id

    const {
      companyId: bodyCompanyId,
      layer,
      partnerAccount,
      accountType,
      accountName,
      bankAccountNo,
      currency,
      status,
      note,
    } = req.body

    // Determine company ID
    let finalCompanyId = bodyCompanyId
    if (userRole === "company") {
      finalCompanyId = tokenCompanyId
    }

    if (!finalCompanyId) {
      throw createHttpError(400, "Company ID is required")
    }

    // Validate company exists
    const company = await Company.findById(finalCompanyId)
    if (!company) {
      throw createHttpError(404, "Company not found")
    }

    // Validate required fields
    if (!layer || !accountType || !accountName || !currency) {
      throw createHttpError(400, "Missing required fields: layer, accountType, accountName, currency")
    }

    let currencyId = null
    if (mongoose.Types.ObjectId.isValid(currency)) {
      // If currency is already an ObjectId, use it directly
      currencyId = currency
    } else if (typeof currency === "string") {
      // If currency is a string code like "USD", find the CompanyCurrency for this company
      const companyCurrency = await CompanyCurrency.findOne({
        company: finalCompanyId,
        currencyCode: currency.toUpperCase(),
        isDeleted: false,
      })
      if (!companyCurrency) {
        throw createHttpError(404, `Currency "${currency}" not configured for this company`)
      }
      currencyId = companyCurrency._id
    } else {
      throw createHttpError(400, "Currency must be a string code (e.g., 'USD') or a valid ObjectId")
    }

    // Validate Partner Account reference if provided
    let partnerAccountId = null
    if (partnerAccount) {
      if (!mongoose.Types.ObjectId.isValid(partnerAccount)) {
        throw createHttpError(400, "Invalid Partner Account ID format")
      }

      const partner = await Partner.findById(partnerAccount)
      if (!partner) {
        throw createHttpError(404, "Partner Account not found")
      }
      if (partner.company.toString() !== finalCompanyId.toString()) {
        throw createHttpError(403, "Partner Account does not belong to this company")
      }

      partnerAccountId = partnerAccount
    }

    // Call atomic helper
    const { account, ledger } = await createBankCashAccountWithLedger(finalCompanyId, {
      layer,
      partnerAccountId,
      accountType,
      accountName,
      bankAccountNo,
      currencyId,
      status,
      note,
    })

    res.status(201).json({
      success: true,
      message: "Bank/Cash Account created successfully",
      data: {
        account: account.toObject(),
        ledger: ledger.toObject(),
      },
    })
  } catch (error) {
    next(error)
  }
}

/**
 * GET /api/company/bank-cash-accounts
 * List all Bank/Cash Accounts for a company
 */
const listBankCashAccounts = async (req, res, next) => {
  try {
    const userRole = req.user?.role
    const tokenCompanyId = req.user?.companyId || req.user?.id

    let finalCompanyId = req.query.companyId
    if (userRole === "company") {
      finalCompanyId = tokenCompanyId
    }

    if (!finalCompanyId) {
      throw createHttpError(400, "Company ID is required")
    }

    const filter = {
      company: finalCompanyId,
      isDeleted: false,
    }

    // Apply optional filters
    if (req.query.accountType) {
      filter.accountType = req.query.accountType
    }
    if (req.query.status) {
      filter.status = req.query.status
    }

    const accounts = await BankCashAccount.find(filter)
      .populate("company", "name")
      .populate("partnerAccount", "name layer")
      .populate("currency", "currencyCode currencyName")
      .populate("ledgerId", "ledgerCode ledgerDescription typeSequence")
      .sort({ createdAt: -1 })

    res.json({
      success: true,
      count: accounts.length,
      data: accounts,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * GET /api/company/bank-cash-accounts/:id
 * Retrieve a specific Bank/Cash Account
 */
const getBankCashAccountById = async (req, res, next) => {
  try {
    const { id } = req.params
    const userRole = req.user?.role
    const tokenCompanyId = req.user?.companyId || req.user?.id

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw createHttpError(400, "Invalid Account ID format")
    }

    const account = await BankCashAccount.findById(id)
      .populate("company", "name")
      .populate("partnerAccount", "name layer")
      .populate("currency", "currencyCode currencyName")
      .populate("ledgerId", "ledgerCode ledgerDescription typeSequence locked systemAccount")

    if (!account || account.isDeleted) {
      throw createHttpError(404, "Bank/Cash Account not found")
    }

    if (userRole === "company" && account.company._id.toString() !== tokenCompanyId.toString()) {
      throw createHttpError(403, "Unauthorized: You do not have access to this account")
    }

    res.json({
      success: true,
      data: account,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * PUT /api/company/bank-cash-accounts/:id
 * Update Bank/Cash Account (excluding ledgerId and ledgerCode - these are immutable)
 */
const updateBankCashAccount = async (req, res, next) => {
  try {
    const { id } = req.params
    const userRole = req.user?.role
    const tokenCompanyId = req.user?.companyId || req.user?.id

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw createHttpError(400, "Invalid Account ID format")
    }

    const account = await BankCashAccount.findById(id)
    if (!account || account.isDeleted) {
      throw createHttpError(404, "Bank/Cash Account not found")
    }

    if (userRole === "company" && account.company.toString() !== tokenCompanyId.toString()) {
      throw createHttpError(403, "Unauthorized")
    }

    // Fields that can be updated
    const allowedFields = ["layer", "accountName", "bankAccountNo", "status", "note"]
    const updateData = {}

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field]
      }
    })

    // Check accountName uniqueness if being updated
    if (updateData.accountName && updateData.accountName !== account.accountName) {
      const duplicate = await BankCashAccount.findOne({
        company: account.company,
        accountName: updateData.accountName,
        isDeleted: false,
      })
      if (duplicate) {
        throw createHttpError(409, `Account name "${updateData.accountName}" already exists`)
      }
    }

    const updated = await BankCashAccount.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate("company", "name")
      .populate("partnerAccount", "name layer")
      .populate("currency", "currencyCode currencyName")
      .populate("ledgerId", "ledgerCode ledgerDescription")

    res.json({
      success: true,
      message: "Account updated successfully",
      data: updated,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * DELETE /api/company/bank-cash-accounts/:id
 * Soft-delete a Bank/Cash Account
 */
const deleteBankCashAccount = async (req, res, next) => {
  try {
    const { id } = req.params
    const userRole = req.user?.role
    const tokenCompanyId = req.user?.companyId || req.user?.id

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw createHttpError(400, "Invalid Account ID format")
    }

    const account = await BankCashAccount.findById(id)
    if (!account || account.isDeleted) {
      throw createHttpError(404, "Bank/Cash Account not found")
    }

    if (userRole === "company" && account.company.toString() !== tokenCompanyId.toString()) {
      throw createHttpError(403, "Unauthorized")
    }

    const deleted = await softDeleteBankCashAccount(id, account.company)

    res.json({
      success: true,
      message: "Bank/Cash Account deleted successfully",
      data: deleted,
    })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  createBankCashAccount,
  listBankCashAccounts,
  getBankCashAccountById,
  updateBankCashAccount,
  deleteBankCashAccount,
}
