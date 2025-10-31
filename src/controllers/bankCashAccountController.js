const createHttpError = require("http-errors")
const {
  listBankCashAccounts,
  getBankCashAccountById,
  createBankCashAccount,
  updateBankCashAccount,
  deleteBankCashAccount,
} = require("../services/bankCashAccountService")

async function getAll(req, res, next) {
  try {
    const { page, limit, q, accountType, status, currency, sortBy, sortOrder } = req.query
    const result = await listBankCashAccounts({
      companyId: req.companyId,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      q,
      accountType,
      status,
      currency,
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
    const account = await getBankCashAccountById(req.params.id, req.companyId)
    if (!account) throw new createHttpError.NotFound("Bank Cash Account not found")
    res.json(account)
  } catch (err) {
    next(err)
  }
}

async function create(req, res, next) {
  try {
    const created = await createBankCashAccount(req.body, req.companyId)
    res.status(201).json(created)
  } catch (err) {
    if (err && err.code === 11000) {
      return next(new createHttpError.Conflict("Account name already exists for this company"))
    }
    next(err)
  }
}

async function update(req, res, next) {
  try {
    const updated = await updateBankCashAccount(req.params.id, req.body, req.companyId)
    if (!updated) throw new createHttpError.NotFound("Bank Cash Account not found")
    res.json(updated)
  } catch (err) {
    if (err && err.code === 11000) {
      return next(new createHttpError.Conflict("Account name already exists for this company"))
    }
    next(err)
  }
}

async function remove(req, res, next) {
  try {
    const result = await deleteBankCashAccount(req.params.id, req.companyId)
    if (!result) throw new createHttpError.NotFound("Bank Cash Account not found")
    res.json({ message: "Bank Cash Account deleted" })
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
