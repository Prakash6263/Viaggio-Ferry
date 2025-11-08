const mongoose = require("mongoose")
const CargoBoarding = require("../models/CargoBoarding")
const CargoCheckin = require("../models/CargoCheckin")
const CargoBooking = require("../models/CargoBooking")
const Trip = require("../models/Trip")

// Get available trips for cargo boarding
async function getAvailableTripsForBoarding(companyId) {
  const trips = await Trip.find({
    company: companyId,
    status: { $in: ["Scheduled", "In Progress"] },
    boardingOpeningDate: { $lte: new Date() },
    boardingClosingDate: { $gte: new Date() },
    isDeleted: false,
  })
    .select("_id tripCode vessel departurePort arrivalPort departureDateTime arrivalDateTime status")
    .populate("vessel", "name vesselCode")
    .populate("departurePort", "name portCode")
    .populate("arrivalPort", "name portCode")
    .sort({ departureDateTime: 1 })

  return trips
}

// Initiate boarding for trip - create cargo boarding records from checked-in cargo
async function initiateBoardingForTrip(companyId, tripId) {
  const trip = await Trip.findOne({ _id: tripId, company: companyId, isDeleted: false })
  if (!trip) throw new Error("Trip not found")

  // Get all checked-in cargo for this trip
  const checkins = await CargoCheckin.find({
    company: companyId,
    trip: tripId,
    checkInStatus: "CheckInComplete",
    isDeleted: false,
  })
    .populate("booking")
    .sort({ checkInStartedAt: 1 })

  const boardingData = {
    tripId,
    tripCode: trip.tripCode,
    vessel: trip.vessel?.toString(),
    totalCargo: checkins.length,
    fullyLoadedCount: 0,
    partiallyLoadedCount: 0,
    noShowCount: 0,
    checkins: checkins.map((c) => ({
      checkinId: c._id,
      bookingId: c.booking?._id,
      manifestNumber: c.cargo?.cargoType,
      status: "Pending",
      cargoType: c.cargo?.cargoType,
    })),
    initiatedAt: new Date(),
  }

  return boardingData
}

// Scan manifest during boarding
async function scanManifest(companyId, tripId, manifestNumber, userId) {
  // Find cargo booking with this manifest
  const booking = await CargoBooking.findOne({
    company: companyId,
    manifestNumber: manifestNumber,
    isDeleted: false,
  })

  if (!booking) throw new Error("Manifest not found")

  // Get cargo check-in record
  const checkin = await CargoCheckin.findOne({
    company: companyId,
    booking: booking._id,
    trip: tripId,
    checkInStatus: "CheckInComplete",
    isDeleted: false,
  })

  if (!checkin) throw new Error("Check-in record not found for this trip")

  // Create or get boarding record
  let boarding = await CargoBoarding.findOne({
    company: companyId,
    manifestNumber: manifestNumber,
    trip: tripId,
    isDeleted: false,
  })

  if (!boarding) {
    boarding = new CargoBoarding({
      company: companyId,
      checkin: checkin._id,
      trip: tripId,
      booking: booking._id,
      manifestNumber,
      boardingStatus: "Pending",
      cargo: {
        cargoType: checkin.cargo?.cargoType,
        description: checkin.cargo?.description,
        totalQuantity: checkin.cargo?.totalQuantity,
        totalWeight: checkin.cargo?.totalWeight,
        totalVolume: checkin.cargo?.totalVolume,
        shipper: checkin.cargo?.shipper,
        receiver: checkin.cargo?.receiver,
      },
      // Populate trip details here
      tripInfo: {
        vesselName: "", // Placeholder for vessel name
        voyageNo: "", // Placeholder for voyage number
        fromPortName: "", // Placeholder for departure port name
        toPortName: "", // Placeholder for arrival port name
        etd: "", // Placeholder for departure date time
        eta: "", // Placeholder for arrival date time
      },
      items:
        checkin.manifestItems?.map((item) => ({
          _id: item._id,
          itemNo: item.itemNo,
          description: item.description,
          quantity: item.quantity,
          weight: item.weight,
          volume: item.volume,
          containerNo: item.containerNo,
          loadedQuantity: 0,
          loadedWeight: 0,
          status: "Pending",
        })) || [],
      createdBy: userId,
    })
  }

  // Populate trip details
  const trip = await Trip.findOne({ _id: tripId, company: companyId, isDeleted: false })
  if (trip) {
    boarding.tripInfo.vesselName = trip.vessel?.name
    boarding.tripInfo.voyageNo = trip.tripCode
    boarding.tripInfo.fromPortName = trip.departurePort?.name
    boarding.tripInfo.toPortName = trip.arrivalPort?.name
    boarding.tripInfo.etd = trip.departureDateTime
    boarding.tripInfo.eta = trip.arrivalDateTime
  }

  await boarding.save()
  return boarding
}

// Update item loading status
async function updateItemLoading(companyId, boardingId, itemId, loadingData, userId) {
  const boarding = await CargoBoarding.findOne({
    _id: boardingId,
    company: companyId,
    isDeleted: false,
  })

  if (!boarding) throw new Error("Boarding record not found")

  // Find item and update loading status
  const item = boarding.items.find((i) => i._id.toString() === itemId)
  if (!item) throw new Error("Item not found in boarding")

  item.loadedQuantity = loadingData.loadedQuantity
  item.loadedWeight = loadingData.loadedWeight

  // Determine item status
  if (item.loadedQuantity === 0) {
    item.status = "Pending"
  } else if (item.loadedQuantity < item.quantity) {
    item.status = "PartiallyLoaded"
  } else {
    item.status = "FullyLoaded"
  }

  // Calculate loading summary
  const loadingSummary = {
    totalItemsPending: boarding.items.filter((i) => i.status === "Pending").length,
    totalItemsLoaded: boarding.items.filter((i) => i.status === "FullyLoaded").length,
    totalWeightPending: boarding.items
      .filter((i) => i.status === "Pending")
      .reduce((sum, i) => sum + (i.weight || 0), 0),
    totalWeightLoaded: boarding.items
      .filter((i) => i.status === "FullyLoaded")
      .reduce((sum, i) => sum + (i.loadedWeight || 0), 0),
  }

  loadingSummary.loadingPercentage =
    boarding.cargo.totalWeight > 0
      ? Math.round((loadingSummary.totalWeightLoaded / boarding.cargo.totalWeight) * 100)
      : 0

  boarding.loadingSummary = loadingSummary

  // Update overall boarding status
  if (boarding.items.every((i) => i.status === "FullyLoaded")) {
    boarding.boardingStatus = "FullyLoaded"
  } else if (boarding.items.some((i) => i.status === "PartiallyLoaded" || i.status === "FullyLoaded")) {
    boarding.boardingStatus = "PartiallyLoaded"
  }

  return boarding.save()
}

// Complete cargo boarding
async function completeBoardingForCargo(companyId, boardingId, userId) {
  const boarding = await CargoBoarding.findOneAndUpdate(
    { _id: boardingId, company: companyId, isDeleted: false },
    {
      boardingStatus: "FullyLoaded",
      boardedAt: new Date(),
      boardedBy: userId,
    },
    { new: true },
  )
    .populate("booking")
    .populate("trip")

  if (!boarding) throw new Error("Boarding record not found")
  return boarding
}

// Get cargo manifest for trip
async function getCargoManifest(companyId, tripId) {
  const boardings = await CargoBoarding.find({
    company: companyId,
    trip: tripId,
    isDeleted: false,
  })
    .populate("cargo")
    .sort({ manifestNumber: 1 })

  const manifest = {
    tripId,
    generatedAt: new Date(),
    totalCargo: boardings.length,
    fullyLoaded: boardings.filter((b) => b.boardingStatus === "FullyLoaded").length,
    partiallyLoaded: boardings.filter((b) => b.boardingStatus === "PartiallyLoaded").length,
    noShow: boardings.filter((b) => b.boardingStatus === "NoShow").length,
    totalItems: boardings.reduce((sum, b) => sum + (b.items?.length || 0), 0),
    totalWeight: boardings.reduce((sum, b) => sum + (b.cargo?.totalWeight || 0), 0),
    cargoList: boardings.map((b) => ({
      boardingId: b._id,
      manifestNumber: b.manifestNumber,
      cargoType: b.cargo?.cargoType,
      description: b.cargo?.description,
      quantity: b.cargo?.totalQuantity,
      weight: b.cargo?.totalWeight,
      shipper: b.cargo?.shipper?.name,
      receiver: b.cargo?.receiver?.name,
      boardingStatus: b.boardingStatus,
      loadingPercentage: b.loadingSummary?.loadingPercentage || 0,
    })),
  }

  return manifest
}

module.exports = {
  getAvailableTripsForBoarding,
  initiateBoardingForTrip,
  scanManifest,
  updateItemLoading,
  completeBoardingForCargo,
  getCargoManifest,
}
