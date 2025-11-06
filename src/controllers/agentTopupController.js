const createHttpError = require("http-errors")
const {
  listAgentTopups,
  getAgentTopupById,
  createAgentTopup,
  updateAgentTopup,
  approveAgentTopup,
  rejectAgentTopup,
  updateConfirmation,
  deleteAgentTopup,
} = require("../services/agentTopupService")

async function getAll(req, res, next) {
  try {
    const { page, limit, q, status, sortBy, sortOrder } = req.query
    const result = await listAgentTopups({
      companyId: req.companyId,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      q,
      status,
      sortBy,
      sortOrder: sortOrder === "asc" ? 1 : -1,
    })
    res.json(result)
  } catch (err) {
    next(err)
  }
}

async function getOne(req, res, next) {
  try {
    const topup = await getAgentTopupById(req.params.id, req.companyId)
    if (!topup) throw new createHttpError.NotFound("Agent topup not found")
    res.json(topup)
  } catch (err) {
    next(err)
  }
}

async function create(req, res, next) {
  try {
    const created = await createAgentTopup(req.body, req.companyId, req.userId)
    res.status(201).json(created)
  } catch (err) {
    if (err && err.code === 11000) {
      return next(new createHttpError.Conflict("Transaction number already exists for this company"))
    }
    next(err)
  }
}

async function update(req, res, next) {
  try {
    const updated = await updateAgentTopup(req.params.id, req.body, req.companyId)
    if (!updated) throw new createHttpError.NotFound("Agent topup not found")
    res.json(updated)
  } catch (err) {
    next(err)
  }
}

async function approve(req, res, next) {
  try {
    const updated = await approveAgentTopup(req.params.id, req.companyId, req.userId)
    res.json({ message: "Agent topup approved", data: updated })
  } catch (err) {
    next(err)
  }
}

async function reject(req, res, next) {
  try {
    const { reason } = req.body
    const updated = await rejectAgentTopup(req.params.id, req.companyId, reason)
    res.json({ message: "Agent topup rejected", data: updated })
  } catch (err) {
    next(err)
  }
}

async function updatePayorConfirmation(req, res, next) {
  try {
    const { status } = req.body
    const updated = await updateConfirmation(req.params.id, "payor", status, req.companyId)
    res.json({ message: "Payor confirmation updated", data: updated })
  } catch (err) {
    next(err)
  }
}

async function updatePayeeConfirmation(req, res, next) {
  try {
    const { status } = req.body
    const updated = await updateConfirmation(req.params.id, "payee", status, req.companyId)
    res.json({ message: "Payee confirmation updated", data: updated })
  } catch (err) {
    next(err)
  }
}

async function remove(req, res, next) {
  try {
    const result = await deleteAgentTopup(req.params.id, req.companyId)
    if (!result) throw new createHttpError.NotFound("Agent topup not found")
    res.json({ message: "Agent topup deleted" })
  } catch (err) {
    next(err)
  }
}

module.exports = {
  getAll,
  getOne,
  create,
  update,
  approve,
  reject,
  updatePayorConfirmation,
  updatePayeeConfirmation,
  remove,
}
