const createHttpError = require("http-errors")
const { listPorts, getPortById, createPort, updatePort, deletePort } = require("../services/portService")

async function getAll(req, res, next) {
  try {
    const { page, limit, q, status, sortBy, sortOrder } = req.query
    const result = await listPorts({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      q,
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
    const port = await getPortById(req.params.id)
    if (!port) throw new createHttpError.NotFound("Port not found")
    res.json(port)
  } catch (err) {
    next(err)
  }
}

async function create(req, res, next) {
  try {
    const created = await createPort(req.body)
    res.status(201).json(created)
  } catch (err) {
    // Duplicate code handling
    if (err && err.code === 11000) {
      return next(new createHttpError.Conflict("Port code already exists"))
    }
    next(err)
  }
}

async function update(req, res, next) {
  try {
    const updated = await updatePort(req.params.id, req.body)
    if (!updated) throw new createHttpError.NotFound("Port not found")
    res.json(updated)
  } catch (err) {
    if (err && err.code === 11000) {
      return next(new createHttpError.Conflict("Port code already exists"))
    }
    next(err)
  }
}

async function remove(req, res, next) {
  try {
    const result = await deletePort(req.params.id)
    if (!result) throw new createHttpError.NotFound("Port not found")
    res.json({ message: "Port deleted" })
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
