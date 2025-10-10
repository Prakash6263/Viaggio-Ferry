const { validationResult } = require("express-validator")
const { listModules, createModule, seedDefaults } = require("../services/moduleService")

function handleValidation(req) {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    const err = new Error("Validation failed")
    err.status = 400
    err.details = errors.array()
    throw err
  }
}

async function index(req, res) {
  const items = await listModules({ activeOnly: true })
  res.json({ items })
}

async function create(req, res) {
  handleValidation(req)
  const item = await createModule(req.body)
  res.status(201).json(item)
}

async function seed(req, res) {
  const result = await seedDefaults()
  res.json(result)
}

module.exports = { index, create, seed }
