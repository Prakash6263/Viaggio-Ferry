const createHttpError = require("http-errors")
const {
  listPayloadTypes,
  getPayloadTypeById,
  createPayloadType,
  updatePayloadType,
  deletePayloadType,
} = require("../services/payloadTypeService")

async function getAll(req, res, next) {
  try {
    const { page, limit, q, category, status, sortBy, sortOrder } = req.query
    const result = await listPayloadTypes({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      q,
      category,
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
    const item = await getPayloadTypeById(req.params.id)
    if (!item) throw new createHttpError.NotFound("Payload type not found")
    res.json(item)
  } catch (err) {
    next(err)
  }
}

async function create(req, res, next) {
  try {
    const created = await createPayloadType(req.body)
    res.status(201).json(created)
  } catch (err) {
    next(err)
  }
}

async function update(req, res, next) {
  try {
    const updated = await updatePayloadType(req.params.id, req.body)
    if (!updated) throw new createHttpError.NotFound("Payload type not found")
    res.json(updated)
  } catch (err) {
    next(err)
  }
}

async function remove(req, res, next) {
  try {
    const result = await deletePayloadType(req.params.id)
    if (!result) throw new createHttpError.NotFound("Payload type not found")
    res.json({ message: "Payload type deleted" })
  } catch (err) {
    next(err)
  }
}

module.exports = { getAll, getOne, create, update, remove }
