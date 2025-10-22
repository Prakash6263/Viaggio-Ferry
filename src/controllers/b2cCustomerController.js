const { validationResult } = require("express-validator")
const createHttpError = require("http-errors")
const service = require("../services/b2cCustomerService")

async function index(req, res) {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ message: "Validation failed", details: errors.array() })
  const result = await service.listB2CCustomers(req.query)
  res.json(result)
}

async function show(req, res) {
  const doc = await service.getB2CCustomer(req.params.id)
  if (!doc) throw createHttpError(404, "B2C Customer not found")
  res.json(doc)
}

async function create(req, res) {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ message: "Validation failed", details: errors.array() })
  const doc = await service.createB2CCustomer(req.body)
  res.status(201).json(doc)
}

async function patch(req, res) {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ message: "Validation failed", details: errors.array() })
  const doc = await service.updateB2CCustomer(req.params.id, req.body)
  res.json(doc)
}

async function destroy(req, res) {
  await service.deleteB2CCustomer(req.params.id)
  res.status(204).send()
}

async function byPartner(req, res) {
  const { partnerId } = req.params
  const customers = await service.getB2CCustomersByPartner(partnerId)
  res.json({ data: customers })
}

module.exports = { index, show, create, patch, destroy, byPartner }
