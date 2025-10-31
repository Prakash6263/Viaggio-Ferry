const { validationResult } = require("express-validator")
const Company = require("../models/Company")

function handleValidation(req) {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    const err = new Error("Validation failed")
    err.status = 400
    err.details = errors.array()
    throw err
  }
}

// Get all pending companies for approval
async function getPendingCompanies(req, res) {
  const { page = 1, limit = 10, q = "" } = req.query

  const filter = { status: "pending" }
  if (q) {
    filter.companyName = { $regex: q, $options: "i" }
  }

  const pageNum = Math.max(Number.parseInt(page, 10) || 1, 1)
  const limitNum = Math.max(Number.parseInt(limit, 10) || 10, 1)
  const skip = (pageNum - 1) * limitNum

  const [items, total] = await Promise.all([
    Company.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
    Company.countDocuments(filter),
  ])

  res.json({
    items,
    total,
    page: pageNum,
    limit: limitNum,
    pages: Math.ceil(total / limitNum),
  })
}

// Get all companies (approved, rejected, pending)
async function getAllCompanies(req, res) {
  const { page = 1, limit = 10, q = "", status = "" } = req.query

  const filter = {}
  if (q) {
    filter.companyName = { $regex: q, $options: "i" }
  }
  if (status) {
    filter.status = status
  }

  const pageNum = Math.max(Number.parseInt(page, 10) || 1, 1)
  const limitNum = Math.max(Number.parseInt(limit, 10) || 10, 1)
  const skip = (pageNum - 1) * limitNum

  const [items, total] = await Promise.all([
    Company.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
    Company.countDocuments(filter),
  ])

  res.json({
    items,
    total,
    page: pageNum,
    limit: limitNum,
    pages: Math.ceil(total / limitNum),
  })
}

// Approve a company
async function approveCompany(req, res) {
  const { id } = req.params
  const superAdminId = req.user.id // From auth middleware

  const company = await Company.findById(id)
  if (!company) {
    const err = new Error("Company not found")
    err.status = 404
    throw err
  }

  if (company.status !== "pending") {
    const err = new Error(`Company status is ${company.status}. Cannot approve.`)
    err.status = 400
    throw err
  }

  company.status = "approved"
  company.approvedBy = superAdminId
  company.approvalDate = new Date()
  await company.save()

  res.json({
    message: "Company approved successfully",
    company: {
      id: company._id,
      companyName: company.companyName,
      status: company.status,
      approvalDate: company.approvalDate,
    },
  })
}

// Reject a company
async function rejectCompany(req, res) {
  handleValidation(req)

  const { id } = req.params
  const { rejectionReason } = req.body
  const superAdminId = req.user.id // From auth middleware

  const company = await Company.findById(id)
  if (!company) {
    const err = new Error("Company not found")
    err.status = 404
    throw err
  }

  if (company.status !== "pending") {
    const err = new Error(`Company status is ${company.status}. Cannot reject.`)
    err.status = 400
    throw err
  }

  company.status = "rejected"
  company.rejectionReason = rejectionReason
  company.approvedBy = superAdminId
  company.approvalDate = new Date()
  await company.save()

  res.json({
    message: "Company rejected successfully",
    company: {
      id: company._id,
      companyName: company.companyName,
      status: company.status,
      rejectionReason: company.rejectionReason,
    },
  })
}

module.exports = {
  getPendingCompanies,
  getAllCompanies,
  approveCompany,
  rejectCompany,
}
