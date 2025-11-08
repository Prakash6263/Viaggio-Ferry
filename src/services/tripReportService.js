const TripReport = require("../models/TripReport")
const Trip = require("../models/Trip")
const PassengerBoarding = require("../models/PassengerBoarding")
const CargoBoarding = require("../models/CargoBoarding")
const VehicleBoarding = require("../models/VehicleBoarding")
const mongoose = require("mongoose") // Import mongoose

// Initiate trip report
async function initiateTripReport(tripId, userId, companyId) {
  const trip = await Trip.findById(tripId)
  if (!trip) {
    const err = new Error("Trip not found")
    err.status = 404
    throw err
  }

  if (trip.status !== "Completed" && trip.status !== "In Progress") {
    const err = new Error("Trip must be completed or in progress to initiate report")
    err.status = 400
    throw err
  }

  // Check if report already exists
  let tripReport = await TripReport.findOne({ trip: tripId })
  if (tripReport) {
    return tripReport
  }

  // Create new report
  tripReport = new TripReport({
    company: companyId,
    trip: tripId,
    reportStatus: "Initiated",
    createdBy: userId,
  })

  await tripReport.save()

  // Update trip with report reference
  trip.tripReport = tripReport._id
  trip.reportingStatus = "InProgress"
  await trip.save()

  return tripReport
}

// Get trip report by trip ID
async function getTripReport(tripId) {
  const tripReport = await TripReport.findOne({ trip: tripId, isDeleted: false })
    .populate("company", "name")
    .populate("trip", "tripCode tripName vessel departurePort arrivalPort departureDateTime arrivalDateTime")
    .populate("createdBy", "name email")
    .populate("finalization.verifiedBy", "name email")
    .populate("finalization.completedBy", "name email")

  if (!tripReport) {
    const err = new Error("Trip report not found")
    err.status = 404
    throw err
  }

  return tripReport
}

// Calculate payload summary from boarding records
async function calculatePayloadSummary(tripId) {
  const passengerBoardings = await PassengerBoarding.find({
    trip: tripId,
    boardingStatus: { $in: ["Verified", "Boarded"] },
    isDeleted: false,
  })

  const cargoBoardings = await CargoBoarding.find({
    trip: tripId,
    boardingStatus: { $in: ["PartiallyLoaded", "FullyLoaded"] },
    isDeleted: false,
  })

  const vehicleBoardings = await VehicleBoarding.find({
    trip: tripId,
    boardingStatus: { $in: ["Verified", "Boarded"] },
    isDeleted: false,
  })

  // Calculate total passenger load (passenger + luggage)
  let totalPassengerLoad = 0
  const passengerRecords = []

  passengerBoardings.forEach((boarding) => {
    const passengerWeight = boarding.passenger?.weight || 0
    const luggageWeight = boarding.luggage?.totalActualWeight || 0
    const totalWeight = passengerWeight + luggageWeight

    totalPassengerLoad += totalWeight

    passengerRecords.push({
      _id: new mongoose.Types.ObjectId(),
      passengerName: boarding.passenger?.name || "Unknown",
      ticketNo: boarding.ticket?.ticketNo || "N/A",
      seatNumber: boarding.seatNumber || "N/A",
      status: boarding.boardingStatus === "Boarded" ? "BOARDED" : "NO_SHOW", // Fixed status
      weight: passengerWeight,
      luggageWeight: luggageWeight,
      boardedAt: boarding.boardedAt,
    })
  })

  // Calculate total cargo weight
  let totalCargoWeight = 0
  const cargoRecords = []

  cargoBoardings.forEach((boarding) => {
    const loadedWeight = boarding.loadingSummary?.totalWeightLoaded || 0
    totalCargoWeight += loadedWeight

    cargoRecords.push({
      _id: new mongoose.Types.ObjectId(),
      manifestNumber: boarding.manifestNumber || "N/A",
      cargoType: boarding.cargo?.cargoType || "General",
      totalWeight: boarding.cargo?.totalWeight || 0,
      loadedWeight: loadedWeight,
      status: boarding.boardingStatus === "FullyLoaded" ? "FULLY_LOADED" : "PARTIALLY_LOADED",
      loadedAt: boarding.boardedAt,
    })
  })

  // Calculate total vehicle weight
  let totalVehiclesWeight = 0
  const vehicleRecords = []

  vehicleBoardings.forEach((boarding) => {
    // Estimate vehicle weight based on vehicle type (can be enhanced)
    const vehicleWeight = 1500 // Default estimate in KG
    totalVehiclesWeight += vehicleWeight

    vehicleRecords.push({
      _id: new mongoose.Types.ObjectId(),
      registration: boarding.vehicle?.registration || "N/A",
      vehicleType: boarding.vehicle?.type || "Unknown",
      boardingTicketNo: boarding.boardingTicketNumber || "N/A",
      parkingSlot: boarding.parkingSlot || "N/A",
      status: boarding.boardingStatus === "Boarded" ? "BOARDED" : "NO_SHOW", // Fixed status
      weight: vehicleWeight,
      boardedAt: boarding.boardedAt,
    })
  })

  const grandTotalPayload = totalPassengerLoad + totalCargoWeight + totalVehiclesWeight

  return {
    payloadSummary: {
      totalPassengerLoad,
      totalCargoWeight,
      totalVehiclesWeight,
      grandTotalPayload,
    },
    passengerRecords,
    cargoRecords,
    vehicleRecords,
  }
}

// Update trip report with manifest data
async function updateTripReportWithManifests(tripId) {
  const tripReport = await TripReport.findOne({ trip: tripId })
  if (!tripReport) {
    const err = new Error("Trip report not found")
    err.status = 404
    throw err
  }

  // Calculate payload summary
  const { payloadSummary, passengerRecords, cargoRecords, vehicleRecords } = await calculatePayloadSummary(tripId)

  // Update payload summary
  tripReport.payloadSummary = payloadSummary

  // Update passenger manifest
  tripReport.passengerManifest.totalPassengers = passengerRecords.length
  tripReport.passengerManifest.totalBoarded = passengerRecords.filter((r) => r.status === "BOARDED").length
  tripReport.passengerManifest.totalNoShow = passengerRecords.filter((r) => r.status === "NO_SHOW").length
  tripReport.passengerManifest.manifestRecords = passengerRecords

  // Update cargo manifest
  tripReport.cargoManifest.totalCargo = cargoRecords.length
  tripReport.cargoManifest.totalLoaded = cargoRecords.filter((r) => r.status === "FULLY_LOADED").length
  tripReport.cargoManifest.loadingPercentage =
    cargoRecords.length > 0 ? Math.round((tripReport.cargoManifest.totalLoaded / cargoRecords.length) * 100) : 0

  // Update vehicle manifest
  tripReport.vehicleManifest.totalVehicles = vehicleRecords.length
  tripReport.vehicleManifest.totalBoarded = vehicleRecords.filter((r) => r.status === "BOARDED").length
  tripReport.vehicleManifest.totalNoShow = vehicleRecords.filter((r) => r.status === "NO_SHOW").length
  tripReport.vehicleManifest.manifestRecords = vehicleRecords

  tripReport.reportStatus = "Verified"
  await tripReport.save()

  return tripReport
}

// Verify trip report
async function verifyTripReport(tripId, userId, notes) {
  const tripReport = await TripReport.findOne({ trip: tripId })
  if (!tripReport) {
    const err = new Error("Trip report not found")
    err.status = 404
    throw err
  }

  tripReport.finalization.verificationStatus = "Verified"
  tripReport.finalization.verifiedBy = userId
  tripReport.finalization.verifiedAt = new Date()
  tripReport.finalization.verificationNotes = notes || ""
  tripReport.reportStatus = "Verified"

  await tripReport.save()

  return tripReport
}

// Complete trip
async function completeTripReport(tripId, userId, notes) {
  const trip = await Trip.findById(tripId)
  if (!trip) {
    const err = new Error("Trip not found")
    err.status = 404
    throw err
  }

  const tripReport = await TripReport.findOne({ trip: tripId })
  if (!tripReport) {
    const err = new Error("Trip report not found")
    err.status = 404
    throw err
  }

  // Complete report
  tripReport.finalization.completionStatus = "Completed"
  tripReport.finalization.completedBy = userId
  tripReport.finalization.completedAt = new Date()
  tripReport.finalization.completionNotes = notes || ""
  tripReport.reportStatus = "Completed"

  await tripReport.save()

  // Update trip status
  trip.status = "Completed"
  trip.reportingStatus = "Completed"
  await trip.save()

  return tripReport
}

// List trip reports
async function listTripReports(filters) {
  const { page = 1, limit = 10, status, companyId, sortBy = "createdAt", sortOrder = "desc" } = filters

  const query = { isDeleted: false }

  if (status) {
    query.reportStatus = status
  }

  if (companyId) {
    query.company = companyId
  }

  const skip = (page - 1) * limit
  const sortObj = { [sortBy]: sortOrder === "desc" ? -1 : 1 }

  const [reports, total] = await Promise.all([
    TripReport.find(query)
      .sort(sortObj)
      .skip(skip)
      .limit(limit)
      .populate("trip", "tripCode tripName vessel")
      .populate("company", "name")
      .lean(),
    TripReport.countDocuments(query),
  ])

  return {
    data: reports,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  }
}

// Add discrepancy
async function addDiscrepancy(tripId, discrepancy) {
  const tripReport = await TripReport.findOne({ trip: tripId })
  if (!tripReport) {
    const err = new Error("Trip report not found")
    err.status = 404
    throw err
  }

  const newDiscrepancy = {
    _id: new mongoose.Types.ObjectId(),
    type: discrepancy.type,
    description: discrepancy.description,
    severity: discrepancy.severity,
    createdAt: new Date(),
  }

  tripReport.discrepancies.push(newDiscrepancy)
  await tripReport.save()

  return tripReport
}

// Resolve discrepancy
async function resolveDiscrepancy(tripId, discrepancyId, resolution) {
  const tripReport = await TripReport.findOne({ trip: tripId })
  if (!tripReport) {
    const err = new Error("Trip report not found")
    err.status = 404
    throw err
  }

  const discrepancy = tripReport.discrepancies.id(discrepancyId)
  if (!discrepancy) {
    const err = new Error("Discrepancy not found")
    err.status = 404
    throw err
  }

  discrepancy.resolvedAt = new Date()
  discrepancy.resolution = resolution

  await tripReport.save()

  return tripReport
}

module.exports = {
  initiateTripReport,
  getTripReport,
  updateTripReportWithManifests,
  verifyTripReport,
  completeTripReport,
  listTripReports,
  addDiscrepancy,
  resolveDiscrepancy,
}
