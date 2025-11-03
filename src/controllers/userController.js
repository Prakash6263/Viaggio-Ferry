const { validationResult } = require("express-validator")
const createHttpError = require("http-errors")
const service = require("../services/userService")

async function index(req, res) {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: "Validation failed", details: errors.array() })
  }
  const result = await service.listUsers(req.query)
  res.json(result)
}

async function show(req, res) {
  const doc = await service.getUser(req.params.id)
  if (!doc) throw createHttpError(404, "User not found")
  res.json(doc)
}

async function create(req, res) {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: "Validation failed", details: errors.array() })
  }
  const payload = {
    fullName: req.body.fullName,
    email: req.body.email,
    position: req.body.position,
    agentId: req.body.agentId,
    isSalesman: req.body.isSalesman,
    remarks: req.body.remarks,
    status: req.body.status,
    accessGroups: req.body.accessGroups,
    company: req.companyId,
  }
  const doc = await service.createUser(payload)
  res.status(201).json(doc)
}

async function patch(req, res) {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: "Validation failed", details: errors.array() })
  }
  const doc = await service.updateUser(req.params.id, req.body)
  res.json(doc)
}

async function destroy(req, res) {
  await service.deleteUser(req.params.id)
  res.status(204).send()
}

module.exports = { index, show, create, patch, destroy }
