const { validationResult } = require("express-validator")
const {
  createCompany,
  listCompanies,
  getCompany,
  updateCompany,
  deleteCompany,
  getCompanyLogo,
} = require("../services/companyService")

function handleValidation(req) {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    const err = new Error("Validation failed")
    err.status = 400
    err.details = errors.array()
    throw err
  }
}

async function create(req, res) {
  handleValidation(req)
  const company = await createCompany(req.body, req.file)
  res.status(201).json(company)
}

async function index(req, res) {
  const { page, limit, q } = req.query
  const result = await listCompanies({ page, limit, q })
  res.json(result)
}

async function show(req, res) {
  const company = await getCompany(req.params.id, { includeLogo: false })
  if (!company) {
    const err = new Error("Company not found")
    err.status = 404
    throw err
  }
  res.json(company)
}

async function logo(req, res) {
  const item = await getCompanyLogo(req.params.id)
  if (!item) {
    const err = new Error("Logo not found")
    err.status = 404
    throw err
  }
  const buffer = Buffer.from(item.dataBase64, "base64")
  res.setHeader("Content-Type", item.mimeType || "image/png")
  res.setHeader("Content-Length", buffer.length)
  res.send(buffer)
}

async function patch(req, res) {
  handleValidation(req)
  const company = await updateCompany(req.params.id, req.body, req.file)
  if (!company) {
    const err = new Error("Company not found")
    err.status = 404
    throw err
  }
  res.json(company)
}

async function destroy(req, res) {
  await deleteCompany(req.params.id)
  res.json({ success: true })
}

module.exports = { create, index, show, logo, patch, destroy }
