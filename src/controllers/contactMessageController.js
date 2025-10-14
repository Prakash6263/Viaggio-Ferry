const { validationResult } = require("express-validator")
const service = require("../services/contactMessageService")

function handleValidation(req) {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    const err = new Error("Validation failed")
    err.status = 400
    err.details = errors.array()
    throw err
  }
}

async function create(req, res, next) {
  try {
    handleValidation(req)
    const { fullName, email, subject, message } = req.body
    const doc = await service.createMessage({ fullName, email, subject, message })
    return res.status(201).json(doc)
  } catch (err) {
    next(err)
  }
}

async function list(req, res, next) {
  try {
    handleValidation(req)
    const { page, limit, q, status, sortBy, sortOrder } = req.query
    const result = await service.listMessages({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      q,
      status,
      sortBy,
      sortOrder,
    })
    return res.json(result)
  } catch (err) {
    next(err)
  }
}

async function getById(req, res, next) {
  try {
    const { id } = req.params
    const doc = await service.getMessageById(id)
    if (!doc) {
      return res.status(404).json({ message: "Contact message not found" })
    }
    return res.json(doc)
  } catch (err) {
    next(err)
  }
}

async function update(req, res, next) {
  try {
    handleValidation(req)
    const { id } = req.params
    const allowed = ["status", "internalNotes"]
    const updates = {}
    for (const key of allowed) {
      if (typeof req.body[key] !== "undefined") updates[key] = req.body[key]
    }

    const doc = await service.updateMessage(id, updates)
    if (!doc) {
      return res.status(404).json({ message: "Contact message not found" })
    }
    return res.json(doc)
  } catch (err) {
    next(err)
  }
}

async function remove(req, res, next) {
  try {
    const { id } = req.params
    const doc = await service.softDeleteMessage(id)
    if (!doc) {
      return res.status(404).json({ message: "Contact message not found" })
    }
    return res.json({ message: "Contact message deleted" })
  } catch (err) {
    next(err)
  }
}

module.exports = { create, list, getById, update, remove }
