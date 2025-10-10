const Company = require("../models/Company")
const { parsePorts } = require("../utils/parse")

function sanitize(doc, opts = { includeLogo: false }) {
  if (!doc) return null
  const obj = doc.toObject({ versionKey: false })
  const hasLogo = Boolean(obj.logo && obj.logo.dataBase64)
  if (!opts.includeLogo) {
    delete obj.logo
    obj.logo = { hasLogo }
  }
  return obj
}

async function createCompany(payload, file) {
  const data = { ...payload }

  if (data.operational) {
    if (data.operational.operatingPorts) {
      data.operational.operatingPorts = parsePorts(data.operational.operatingPorts)
    }
    if (data.operational.defaultCurrency) {
      data.operational.defaultCurrency = String(data.operational.defaultCurrency).toUpperCase()
    }
  }

  if (file) {
    data.logo = {
      dataBase64: file.buffer.toString("base64"),
      mimeType: file.mimetype,
    }
  }

  const doc = await Company.create(data)
  return sanitize(doc)
}

async function listCompanies({ page = 1, limit = 10, q = "" }) {
  const filter = q ? { companyName: { $regex: q, $options: "i" } } : {}
  const pageNum = Math.max(Number.parseInt(page, 10) || 1, 1)
  const limitNum = Math.max(Number.parseInt(limit, 10) || 10, 1)
  const skip = (pageNum - 1) * limitNum

  const [items, total] = await Promise.all([
    Company.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
    Company.countDocuments(filter),
  ])

  return {
    items: items.map((d) => sanitize(d)),
    total,
    page: pageNum,
    limit: limitNum,
    pages: Math.ceil(total / limitNum),
  }
}

async function getCompany(id, { includeLogo = false } = {}) {
  const doc = await Company.findById(id)
  return sanitize(doc, { includeLogo })
}

async function updateCompany(id, payload, file) {
  const data = { ...payload }

  if (data.operational && data.operational.operatingPorts) {
    data.operational.operatingPorts = parsePorts(data.operational.operatingPorts)
  }
  if (data.operational && data.operational.defaultCurrency) {
    data.operational.defaultCurrency = String(data.operational.defaultCurrency).toUpperCase()
  }

  if (file) {
    data.logo = {
      dataBase64: file.buffer.toString("base64"),
      mimeType: file.mimetype,
    }
  }

  const doc = await Company.findByIdAndUpdate(id, data, { new: true, runValidators: true })
  return sanitize(doc)
}

async function deleteCompany(id) {
  await Company.findByIdAndDelete(id)
  return { success: true }
}

async function getCompanyLogo(id) {
  const doc = await Company.findById(id)
  if (!doc || !doc.logo || !doc.logo.dataBase64) return null
  return { mimeType: doc.logo.mimeType || "image/png", dataBase64: doc.logo.dataBase64 }
}

module.exports = {
  createCompany,
  listCompanies,
  getCompany,
  updateCompany,
  deleteCompany,
  getCompanyLogo,
}
