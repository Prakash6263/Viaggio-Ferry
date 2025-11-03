const { validationResult } = require("express-validator")
const createHttpError = require("http-errors")
const service = require("../services/partnerService")

async function index(req, res) {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ message: "Validation failed", details: errors.array() })
  const result = await service.listPartners(req.query)
  res.json(result)
}

async function show(req, res) {
  const doc = await service.getPartner(req.params.id)
  if (!doc) throw createHttpError(404, "Partner not found")
  res.json(doc)
}

async function create(req, res) {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ message: "Validation failed", details: errors.array() })
  const doc = await service.createPartner({ ...req.body, company: req.companyId })
  res.status(201).json(doc)
}

async function patch(req, res) {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ message: "Validation failed", details: errors.array() })
  const doc = await service.updatePartner(req.params.id, req.body)
  res.json(doc)
}

async function destroy(req, res) {
  await service.deletePartner(req.params.id)
  res.status(204).send()
}

async function byLayer(req, res) {
  const { layer } = req.params
  const partners = await service.getPartnersByLayer(layer)
  res.json({ data: partners })
}

async function options(_req, res) {
  const groups = await service.getPartnerOptions()
  res.json({ data: groups })
}

module.exports = { index, show, create, patch, destroy, byLayer, options }
