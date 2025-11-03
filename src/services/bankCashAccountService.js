const { BankCashAccount } = require("../models/BankCashAccount")
const { Currency } = require("../models/Currency")

const buildFilter = ({ companyId, q, accountType, status, currencyId }) => {
  const filter = { company: companyId, isDeleted: false }
  if (status) filter.status = status
  if (accountType) filter.accountType = accountType
  if (currencyId) filter.currency = currencyId
  if (q) {
    const regex = new RegExp(q, "i")
    Object.assign(filter, {
      $or: [{ accountName: regex }, { bankAccountNo: regex }, { ledgerCode: regex }, { accountType: regex }],
    })
  }
  return filter
}

async function listBankCashAccounts({
  companyId,
  page = 1,
  limit = 10,
  q,
  accountType,
  status,
  currencyId,
  sortBy = "createdAt",
  sortOrder = "desc",
}) {
  const filter = buildFilter({ companyId, q, accountType, status, currencyId })
  const sort = { [sortBy]: sortOrder === "asc" ? 1 : -1 }

  const [total, data] = await Promise.all([
    BankCashAccount.countDocuments(filter),
    BankCashAccount.find(filter)
      .populate("chartOfAccount", "ledgerCode ledgerDescription ledgerType")
      .populate("currency", "code name symbol")
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit),
  ])

  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  }
}

async function getBankCashAccountById(id, companyId) {
  const account = await BankCashAccount.findOne({
    _id: id,
    company: companyId,
    isDeleted: false,
  })
    .populate("chartOfAccount", "ledgerCode ledgerDescription ledgerType")
    .populate("currency", "code name symbol")
  return account
}

async function createBankCashAccount(payload, companyId) {
  const currency = await Currency.findOne({ _id: payload.currency, company: companyId, isDeleted: false })
  if (!currency) {
    throw new Error("Invalid currency")
  }

  const doc = {
    company: companyId,
    layer: payload.layer,
    partnerAccount: payload.partnerAccount || "N/A",
    accountType: payload.accountType,
    accountName: payload.accountName,
    bankAccountNo: payload.bankAccountNo || "N/A",
    currency: payload.currency,
    ledgerCode: payload.ledgerCode?.toUpperCase(),
    chartOfAccount: payload.chartOfAccount || null,
    status: payload.status || "Active",
    note: payload.note || "",
  }
  return await BankCashAccount.create(doc)
}

async function updateBankCashAccount(id, payload, companyId) {
  const updates = {}
  if (payload.layer !== undefined) updates.layer = payload.layer
  if (payload.partnerAccount !== undefined) updates.partnerAccount = payload.partnerAccount
  if (payload.accountType !== undefined) updates.accountType = payload.accountType
  if (payload.accountName !== undefined) updates.accountName = payload.accountName
  if (payload.bankAccountNo !== undefined) updates.bankAccountNo = payload.bankAccountNo
  if (payload.currency !== undefined) {
    // Validate currency exists
    const currency = await Currency.findOne({ _id: payload.currency, company: companyId, isDeleted: false })
    if (!currency) {
      throw new Error("Invalid currency")
    }
    updates.currency = payload.currency
  }
  if (payload.ledgerCode !== undefined) updates.ledgerCode = String(payload.ledgerCode).toUpperCase()
  if (payload.chartOfAccount !== undefined) updates.chartOfAccount = payload.chartOfAccount
  if (payload.status !== undefined) updates.status = payload.status
  if (payload.note !== undefined) updates.note = payload.note

  const updated = await BankCashAccount.findOneAndUpdate({ _id: id, company: companyId, isDeleted: false }, updates, {
    new: true,
    runValidators: true,
  })
    .populate("chartOfAccount", "ledgerCode ledgerDescription ledgerType")
    .populate("currency", "code name symbol")
  return updated
}

async function deleteBankCashAccount(id, companyId) {
  const result = await BankCashAccount.findOneAndUpdate(
    { _id: id, company: companyId, isDeleted: false },
    { isDeleted: true },
    { new: true },
  )
  return result
}

module.exports = {
  listBankCashAccounts,
  getBankCashAccountById,
  createBankCashAccount,
  updateBankCashAccount,
  deleteBankCashAccount,
}
