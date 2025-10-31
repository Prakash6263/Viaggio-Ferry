const createHttpError = require("http-errors")
const {
  listChartOfAccounts,
  getChartOfAccountById,
  createChartOfAccount,
  updateChartOfAccount,
  deleteChartOfAccount,
} = require("../services/chartOfAccountService")

async function getAll(req, res, next) {
  try {
    const { page, limit, q, ledgerType, status, sortBy, sortOrder } = req.query
    const result = await listChartOfAccounts({
      companyId: req.companyId,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      q,
      ledgerType,
      status,
      sortBy,
      sortOrder,
    })
    res.json(result)
  } catch (err) {
    next(err)
  }
}

async function getOne(req, res, next) {
  try {
    const account = await getChartOfAccountById(req.params.id, req.companyId)
    if (!account) throw new createHttpError.NotFound("Chart of Account not found")
    res.json(account)
  } catch (err) {
    next(err)
  }
}

async function create(req, res, next) {
  try {
    const created = await createChartOfAccount(req.body, req.companyId)
    res.status(201).json(created)
  } catch (err) {
    // Duplicate ledger code handling
    if (err && err.code === 11000) {
      return next(new createHttpError.Conflict("Ledger code already exists for this company"))
    }
    next(err)
  }
}

async function update(req, res, next) {
  try {
    const updated = await updateChartOfAccount(req.params.id, req.body, req.companyId)
    if (!updated) throw new createHttpError.NotFound("Chart of Account not found")
    res.json(updated)
  } catch (err) {
    if (err && err.code === 11000) {
      return next(new createHttpError.Conflict("Ledger code already exists for this company"))
    }
    next(err)
  }
}

async function remove(req, res, next) {
  try {
    const result = await deleteChartOfAccount(req.params.id, req.companyId)
    if (!result) throw new createHttpError.NotFound("Chart of Account not found")
    res.json({ message: "Chart of Account deleted" })
  } catch (err) {
    next(err)
  }
}

module.exports = {
  getAll,
  getOne,
  create,
  update,
  remove,
}
