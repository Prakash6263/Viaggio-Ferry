const { ChartOfAccount } = require("../models/ChartOfAccount")

const buildFilter = ({ companyId, q, ledgerType, status }) => {
  const filter = { company: companyId, isDeleted: false }
  if (status) filter.status = status
  if (ledgerType) filter.ledgerType = ledgerType
  if (q) {
    const regex = new RegExp(q, "i")
    Object.assign(filter, {
      $or: [{ ledgerDescription: regex }, { ledgerCode: regex }, { ledgerType: regex }],
    })
  }
  return filter
}

async function listChartOfAccounts({
  companyId,
  page = 1,
  limit = 10,
  q,
  ledgerType,
  status,
  sortBy = "createdAt",
  sortOrder = "desc",
}) {
  const filter = buildFilter({ companyId, q, ledgerType, status })
  const sort = { [sortBy]: sortOrder === "asc" ? 1 : -1 }

  const [total, data] = await Promise.all([
    ChartOfAccount.countDocuments(filter),
    ChartOfAccount.find(filter)
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

async function getChartOfAccountById(id, companyId) {
  const account = await ChartOfAccount.findOne({ _id: id, company: companyId, isDeleted: false })
  return account
}

async function createChartOfAccount(payload, companyId) {
  const doc = {
    company: companyId,
    ledgerCode: payload.ledgerCode?.toUpperCase(),
    ledgerDescription: payload.ledgerDescription,
    ledgerType: payload.ledgerType,
    typeSequence: payload.typeSequence,
    status: payload.status || "Active",
    systemAccount: payload.systemAccount || false,
    partnerAccount: payload.partnerAccount || "N/A",
    notes: payload.notes || "",
  }
  return await ChartOfAccount.create(doc)
}

async function updateChartOfAccount(id, payload, companyId) {
  const updates = {}
  if (payload.ledgerCode !== undefined) updates.ledgerCode = String(payload.ledgerCode).toUpperCase()
  if (payload.ledgerDescription !== undefined) updates.ledgerDescription = payload.ledgerDescription
  if (payload.ledgerType !== undefined) updates.ledgerType = payload.ledgerType
  if (payload.typeSequence !== undefined) updates.typeSequence = payload.typeSequence
  if (payload.status !== undefined) updates.status = payload.status
  if (payload.systemAccount !== undefined) updates.systemAccount = payload.systemAccount
  if (payload.partnerAccount !== undefined) updates.partnerAccount = payload.partnerAccount
  if (payload.notes !== undefined) updates.notes = payload.notes

  const updated = await ChartOfAccount.findOneAndUpdate({ _id: id, company: companyId, isDeleted: false }, updates, {
    new: true,
    runValidators: true,
  })
  return updated
}

async function deleteChartOfAccount(id, companyId) {
  const result = await ChartOfAccount.findOneAndUpdate(
    { _id: id, company: companyId, isDeleted: false },
    { isDeleted: true },
    { new: true },
  )
  return result
}

module.exports = {
  listChartOfAccounts,
  getChartOfAccountById,
  createChartOfAccount,
  updateChartOfAccount,
  deleteChartOfAccount,
}
