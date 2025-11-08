const { validationResult } = require("express-validator")
const {
  initiateTripReport,
  getTripReport,
  updateTripReportWithManifests,
  verifyTripReport,
  completeTripReport,
  listTripReports,
  addDiscrepancy,
  resolveDiscrepancy,
} = require("../services/tripReportService")

function handleValidation(req) {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    const err = new Error("Validation failed")
    err.status = 400
    err.details = errors.array()
    throw err
  }
}

// List all trip reports
async function index(req, res) {
  const { page, limit, status, sortBy, sortOrder } = req.query
  const companyId = req.user?.company || req.body.company

  const result = await listTripReports({
    page: Number.parseInt(page) || 1,
    limit: Number.parseInt(limit) || 10,
    status,
    companyId,
    sortBy: sortBy || "createdAt",
    sortOrder: sortOrder || "desc",
  })

  res.json(result)
}

// Get trip report by trip ID
async function show(req, res) {
  const tripReport = await getTripReport(req.params.tripId)
  res.json(tripReport)
}

// Initiate trip report
async function initiate(req, res) {
  const { tripId } = req.params
  const userId = req.user?.id || req.body.userId
  const companyId = req.user?.company || req.body.company

  const tripReport = await initiateTripReport(tripId, userId, companyId)
  res.status(201).json(tripReport)
}

// Refresh manifests and update report
async function refreshManifests(req, res) {
  const { tripId } = req.params

  const tripReport = await updateTripReportWithManifests(tripId)
  res.json(tripReport)
}

// Verify trip report
async function verify(req, res) {
  handleValidation(req)
  const { tripId } = req.params
  const { notes } = req.body
  const userId = req.user?.id || req.body.userId

  const tripReport = await verifyTripReport(tripId, userId, notes)
  res.json(tripReport)
}

// Complete trip
async function complete(req, res) {
  handleValidation(req)
  const { tripId } = req.params
  const { notes } = req.body
  const userId = req.user?.id || req.body.userId

  const tripReport = await completeTripReport(tripId, userId, notes)
  res.json(tripReport)
}

// Add discrepancy
async function addDiscrepancyHandler(req, res) {
  handleValidation(req)
  const { tripId } = req.params
  const { type, description, severity } = req.body

  const tripReport = await addDiscrepancy(tripId, { type, description, severity })
  res.status(201).json(tripReport)
}

// Resolve discrepancy
async function resolveDiscrepancyHandler(req, res) {
  handleValidation(req)
  const { tripId, discrepancyId } = req.params
  const { resolution } = req.body

  const tripReport = await resolveDiscrepancy(tripId, discrepancyId, resolution)
  res.json(tripReport)
}

module.exports = {
  index,
  show,
  initiate,
  refreshManifests,
  verify,
  complete,
  addDiscrepancyHandler,
  resolveDiscrepancyHandler,
}
