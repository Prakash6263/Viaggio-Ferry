const createHttpError = require("http-errors")
const { listCabins, getCabinById, createCabin, updateCabin, deleteCabin } = require("../services/cabinService")

async function getAll(req, res, next) {
  try {
    const { page, limit, q, type, status, sortBy, sortOrder } = req.query
    const result = await listCabins({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      q,
      type,
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
    const cabin = await getCabinById(req.params.id)
    if (!cabin) throw new createHttpError.NotFound("Cabin not found")
    res.json(cabin)
  } catch (err) {
    next(err)
  }
}

async function create(req, res, next) {
  try {
    const created = await createCabin(req.body)
    res.status(201).json(created)
  } catch (err) {
    next(err)
  }
}

async function update(req, res, next) {
  try {
    const updated = await updateCabin(req.params.id, req.body)
    if (!updated) throw new createHttpError.NotFound("Cabin not found")
    res.json(updated)
  } catch (err) {
    next(err)
  }
}

async function remove(req, res, next) {
  try {
    const result = await deleteCabin(req.params.id)
    if (!result) throw new createHttpError.NotFound("Cabin not found")
    res.json({ message: "Cabin deleted" })
  } catch (err) {
    next(err)
  }
}

module.exports = { getAll, getOne, create, update, remove }
