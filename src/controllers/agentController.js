const { validationResult } = require("express-validator")
const createHttpError = require("http-errors")
const service = require("../services/agentService")

async function index(req, res) {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ message: "Validation failed", details: errors.array() })
  const result = await service.listAgents(req.query, req.companyId)
  res.json(result)
}

async function show(req, res) {
  const doc = await service.getAgent(req.params.id, req.companyId)
  if (!doc) throw createHttpError(404, "Agent not found")
  res.json(doc)
}

async function create(req, res) {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ message: "Validation failed", details: errors.array() })
  const doc = await service.createAgent(req.body, req.companyId)
  res.status(201).json(doc)
}

async function patch(req, res) {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ message: "Validation failed", details: errors.array() })
  const doc = await service.updateAgent(req.params.id, req.body, req.companyId)
  res.json(doc)
}

async function destroy(req, res) {
  await service.deleteAgent(req.params.id, req.companyId)
  res.status(204).send()
}

async function tree(req, res) {
  const tree = await service.getAgentTree(req.companyId)
  res.json({ data: tree })
}

async function options(req, res) {
  const groups = await service.getAgentGroupedOptions(req.companyId)
  res.json({ data: groups })
}

module.exports = { index, show, create, patch, destroy, tree, options }
