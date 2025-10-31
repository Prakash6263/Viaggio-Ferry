const { BankCashAccount } = require("../models/BankCashAccount")

const buildFilter = ({ companyId, q, accountType, status, currency }) => {
  const filter = { company: companyId, isDeleted: false }
  if (status) filter.status = status
  if (accountType) filter.accountType = accountType
  if (currency) filter.currency = currency
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
  currency,
  sortBy = "createdAt",
  sortOrder = "desc",
}) {
  const filter = buildFilter({ companyId, q, accountType, status, currency })
  const sort = { [sortBy]: sortOrder === "asc" ? 1 : -1 }

  const [total, data] = await Promise.all([
    BankCashAccount.countDocuments(filter),
    BankCashAccount.find(filter)
      .populate("chartOfAccount", "ledgerCode ledgerDescription ledgerType")
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
  }).populate("chartOfAccount", "ledgerCode ledgerDescription ledgerType")
  return account
}

async function createBankCashAccount(payload, companyId) {
  const doc = {
    company: companyId,
    layer: payload.layer,
    partnerAccount: payload.partnerAccount || "N/A",
    accountType: payload.accountType,
    accountName: payload.accountName,
    bankAccountNo: payload.bankAccountNo || "N/A",
    currency: payload.currency || "USD",
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
  if (payload.currency !== undefined) updates.currency = payload.currency
  if (payload.ledgerCode !== undefined) updates.ledgerCode = String(payload.ledgerCode).toUpperCase()
  if (payload.chartOfAccount !== undefined) updates.chartOfAccount = payload.chartOfAccount
  if (payload.status !== undefined) updates.status = payload.status
  if (payload.note !== undefined) updates.note = payload.note

  const updated = await BankCashAccount.findOneAndUpdate({ _id: id, company: companyId, isDeleted: false }, updates, {
    new: true,
    runValidators: true,
  }).populate("chartOfAccount", "ledgerCode ledgerDescription ledgerType")
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
