const createHttpError = require("http-errors")
const { AgentTopup } = require("../models/AgentTopup")
const { Partner } = require("../models/Partner")
const { ChartOfAccount } = require("../models/ChartOfAccount")
const { Currency } = require("../models/Currency")

async function listAgentTopups({
  companyId,
  page = 1,
  limit = 10,
  q,
  status,
  sortBy = "transactionDate",
  sortOrder = -1,
}) {
  const skip = (page - 1) * limit
  const filter = { company: companyId, isDeleted: false }

  if (status) filter.status = status
  if (q) {
    filter.$or = [{ transactionNo: { $regex: q, $options: "i" } }, { notes: { $regex: q, $options: "i" } }]
  }

  const total = await AgentTopup.countDocuments(filter)
  const topups = await AgentTopup.find(filter)
    .populate("payorDetails.partner", "name")
    .populate("payorDetails.ledger", "ledgerCode ledgerDescription")
    .populate("payeeDetails.partner", "name")
    .populate("payeeDetails.ledger", "ledgerCode ledgerDescription")
    .populate("amountCurrency", "code symbol")
    .populate("createdBy", "fullName email")
    .populate("approvedBy", "fullName email")
    .sort({ [sortBy]: sortOrder })
    .skip(skip)
    .limit(limit)

  return {
    data: topups,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  }
}

async function getAgentTopupById(id, companyId) {
  const topup = await AgentTopup.findOne({ _id: id, company: companyId, isDeleted: false })
    .populate("payorDetails.partner")
    .populate("payorDetails.ledger")
    .populate("payeeDetails.partner")
    .populate("payeeDetails.ledger")
    .populate("amountCurrency")
    .populate("createdBy", "fullName email")
    .populate("approvedBy", "fullName email")

  return topup
}

async function createAgentTopup(data, companyId, userId) {
  // Validate that partners and ledgers exist for the company
  const payorPartner = await Partner.findOne({
    _id: data.payorDetails.partner,
    company: companyId,
  })
  if (!payorPartner) throw new createHttpError.BadRequest("Payor partner not found")

  const payeePartner = await Partner.findOne({
    _id: data.payeeDetails.partner,
    company: companyId,
  })
  if (!payeePartner) throw new createHttpError.BadRequest("Payee partner not found")

  const payorLedger = await ChartOfAccount.findOne({
    _id: data.payorDetails.ledger,
    company: companyId,
  })
  if (!payorLedger) throw new createHttpError.BadRequest("Payor ledger not found")

  const payeeLedger = await ChartOfAccount.findOne({
    _id: data.payeeDetails.ledger,
    company: companyId,
  })
  if (!payeeLedger) throw new createHttpError.BadRequest("Payee ledger not found")

  const currency = await Currency.findById(data.amountCurrency)
  if (!currency) throw new createHttpError.BadRequest("Currency not found")

  // Calculate SDG amount
  const amountSDG = data.amount * data.rateOfExchange

  const topup = new AgentTopup({
    company: companyId,
    transactionNo: data.transactionNo,
    transactionDate: data.transactionDate,
    payorDetails: {
      partner: data.payorDetails.partner,
      ledger: data.payorDetails.ledger,
    },
    payeeDetails: {
      partner: data.payeeDetails.partner,
      ledger: data.payeeDetails.ledger,
    },
    amountCurrency: data.amountCurrency,
    amount: data.amount,
    rateOfExchange: data.rateOfExchange,
    amountSDG,
    notes: data.notes || "",
    documentUpload: data.documentUpload || {},
    createdBy: userId,
  })

  await topup.save()
  return getAgentTopupById(topup._id, companyId)
}

async function updateAgentTopup(id, data, companyId) {
  const topup = await AgentTopup.findOne({ _id: id, company: companyId, isDeleted: false })
  if (!topup) throw new createHttpError.NotFound("Agent topup not found")

  // Only allow updates if status is Pending
  if (topup.status !== "Pending") {
    throw new createHttpError.BadRequest("Cannot update topup with status: " + topup.status)
  }

  // Validate references if provided
  if (data.payorDetails?.partner) {
    const payorPartner = await Partner.findOne({
      _id: data.payorDetails.partner,
      company: companyId,
    })
    if (!payorPartner) throw new createHttpError.BadRequest("Payor partner not found")
    topup.payorDetails.partner = data.payorDetails.partner
  }

  if (data.payorDetails?.ledger) {
    const payorLedger = await ChartOfAccount.findOne({
      _id: data.payorDetails.ledger,
      company: companyId,
    })
    if (!payorLedger) throw new createHttpError.BadRequest("Payor ledger not found")
    topup.payorDetails.ledger = data.payorDetails.ledger
  }

  if (data.payeeDetails?.partner) {
    const payeePartner = await Partner.findOne({
      _id: data.payeeDetails.partner,
      company: companyId,
    })
    if (!payeePartner) throw new createHttpError.BadRequest("Payee partner not found")
    topup.payeeDetails.partner = data.payeeDetails.partner
  }

  if (data.payeeDetails?.ledger) {
    const payeeLedger = await ChartOfAccount.findOne({
      _id: data.payeeDetails.ledger,
      company: companyId,
    })
    if (!payeeLedger) throw new createHttpError.BadRequest("Payee ledger not found")
    topup.payeeDetails.ledger = data.payeeDetails.ledger
  }

  // Update basic fields
  if (data.transactionDate) topup.transactionDate = data.transactionDate
  if (data.amountCurrency) topup.amountCurrency = data.amountCurrency
  if (data.amount !== undefined) topup.amount = data.amount
  if (data.rateOfExchange !== undefined) topup.rateOfExchange = data.rateOfExchange
  if (data.notes !== undefined) topup.notes = data.notes
  if (data.documentUpload) topup.documentUpload = data.documentUpload

  // Recalculate SDG amount
  topup.amountSDG = topup.amount * topup.rateOfExchange

  await topup.save()
  return getAgentTopupById(topup._id, companyId)
}

async function approveAgentTopup(id, companyId, userId) {
  const topup = await AgentTopup.findOne({ _id: id, company: companyId, isDeleted: false })
  if (!topup) throw new createHttpError.NotFound("Agent topup not found")

  if (topup.status !== "Pending") {
    throw new createHttpError.BadRequest("Only pending topups can be approved")
  }

  topup.status = "Approved"
  topup.approvedBy = userId
  topup.approvalDate = new Date()

  await topup.save()
  return getAgentTopupById(topup._id, companyId)
}

async function rejectAgentTopup(id, companyId, rejectionReason) {
  const topup = await AgentTopup.findOne({ _id: id, company: companyId, isDeleted: false })
  if (!topup) throw new createHttpError.NotFound("Agent topup not found")

  if (topup.status !== "Pending") {
    throw new createHttpError.BadRequest("Only pending topups can be rejected")
  }

  topup.status = "Rejected"
  topup.rejectionReason = rejectionReason || ""

  await topup.save()
  return getAgentTopupById(topup._id, companyId)
}

async function updateConfirmation(id, confirmationType, status, companyId) {
  const topup = await AgentTopup.findOne({ _id: id, company: companyId, isDeleted: false })
  if (!topup) throw new createHttpError.NotFound("Agent topup not found")

  const validTypes = ["payor", "payee"]
  if (!validTypes.includes(confirmationType)) {
    throw new createHttpError.BadRequest("Invalid confirmation type")
  }

  const validStatuses = ["Pending", "Confirmed", "Rejected"]
  if (!validStatuses.includes(status)) {
    throw new createHttpError.BadRequest("Invalid confirmation status")
  }

  if (confirmationType === "payor") {
    topup.payorDetails.confirmation = status
  } else {
    topup.payeeDetails.confirmation = status
  }

  // Update topup status if both confirmations are confirmed
  if (topup.payorDetails.confirmation === "Confirmed" && topup.payeeDetails.confirmation === "Confirmed") {
    topup.status = "Completed"
  }

  await topup.save()
  return getAgentTopupById(topup._id, companyId)
}

async function deleteAgentTopup(id, companyId) {
  const topup = await AgentTopup.findOne({ _id: id, company: companyId, isDeleted: false })
  if (!topup) throw new createHttpError.NotFound("Agent topup not found")

  // Only allow deletion if status is Pending or Rejected
  if (topup.status !== "Pending" && topup.status !== "Rejected") {
    throw new createHttpError.BadRequest("Cannot delete topup with status: " + topup.status)
  }

  topup.isDeleted = true
  await topup.save()

  return true
}

module.exports = {
  listAgentTopups,
  getAgentTopupById,
  createAgentTopup,
  updateAgentTopup,
  approveAgentTopup,
  rejectAgentTopup,
  updateConfirmation,
  deleteAgentTopup,
}
