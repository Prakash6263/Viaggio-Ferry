const { validationResult } = require("express-validator")
const { listGroups, createGroup, getGroup, updateGroup, deleteGroup } = require("../services/accessGroupService")

function handleValidation(req) {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    const err = new Error("Validation failed")
    err.status = 400
    err.details = errors.array()
    throw err
  }
}
//

async function index(req, res) {
  handleValidation(req)
  const { companyId, page, limit, q, moduleCode, layer, status } = req.query
  const result = await listGroups({ companyId, page, limit, q, moduleCode, layer, status })
  res.json(result)
}

async function create(req, res) {
  handleValidation(req)
  const payload = req.body
  if (Array.isArray(payload.permissions)) {
    // normalize missing boolean flags
    payload.permissions = payload.permissions.map((p) => ({
      submoduleCode: String(p.submoduleCode || "").toLowerCase(),
      canRead: Boolean(p.canRead),
      canWrite: Boolean(p.canWrite),
      canEdit: Boolean(p.canEdit),
      canDelete: Boolean(p.canDelete),
    }))
  }
  const doc = await createGroup(payload)
  res.status(201).json(doc)
}

async function show(req, res) {
  const doc = await getGroup(req.params.id)
  if (!doc) {
    const err = new Error("Access group not found")
    err.status = 404
    throw err
  }
  res.json(doc)
}

async function patch(req, res) {
  handleValidation(req)
  const payload = req.body
  if (Array.isArray(payload.permissions)) {
    payload.permissions = payload.permissions.map((p) => ({
      submoduleCode: String(p.submoduleCode || "").toLowerCase(),
      canRead: Boolean(p.canRead),
      canWrite: Boolean(p.canWrite),
      canEdit: Boolean(p.canEdit),
      canDelete: Boolean(p.canDelete),
    }))
  }
  const doc = await updateGroup(req.params.id, payload)
  if (!doc) {
    const err = new Error("Access group not found")
    err.status = 404
    throw err
  }
  res.json(doc)
}

async function destroy(req, res) {
  await deleteGroup(req.params.id)
  res.json({ success: true })
}

module.exports = { index, create, show, patch, destroy }
