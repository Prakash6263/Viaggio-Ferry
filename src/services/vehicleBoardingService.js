const mongoose = require("mongoose")
const VehicleBoarding = require("../models/VehicleBoarding")
const VehicleCheckin = require("../models/VehicleCheckin")
const VehicleBooking = require("../models/VehicleBooking")
const Trip = require("../models/Trip")

// Get available trips for vehicle boarding
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

// Initiate boarding for trip - create vehicle boarding records from checked-in vehicles
async function initiateBoardingForTrip(companyId, tripId) {
  const trip = await Trip.findOne({ _id: tripId, company: companyId, isDeleted: false })
  if (!trip) throw new Error("Trip not found")

  // Get all checked-in vehicles for this trip
  const checkins = await VehicleCheckin.find({
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
    totalVehicles: checkins.length,
    boardedCount: 0,
    noShowCount: 0,
    checkins: checkins.map((c) => ({
      checkinId: c._id,
      bookingId: c.booking?._id,
      vehicleRegistration: c.vehicle?.registrationNumber,
      status: "Pending",
      vehicleType: c.vehicle?.type,
    })),
    initiatedAt: new Date(),
  }

  return boardingData
}

// Scan vehicle boarding ticket
async function scanBoardingTicket(companyId, tripId, boardingTicketNumber, parkingSlot, userId) {
  // Find vehicle booking with this boarding ticket
  const booking = await VehicleBooking.findOne({
    company: companyId,
    "boardingTicket.boardingTicketNumber": boardingTicketNumber,
    isDeleted: false,
  })

  if (!booking) throw new Error("Boarding ticket not found")

  // Get vehicle check-in record
  const checkin = await VehicleCheckin.findOne({
    company: companyId,
    booking: booking._id,
    trip: tripId,
    checkInStatus: "CheckInComplete",
    isDeleted: false,
  })

  if (!checkin) throw new Error("Check-in record not found for this trip")

  // Check if parking slot is available
  const existingBoarding = await VehicleBoarding.findOne({
    company: companyId,
    trip: tripId,
    parkingSlot: parkingSlot,
    boardingStatus: { $in: ["Verified", "Boarded"] },
    isDeleted: false,
  })

  if (existingBoarding) throw new Error("Parking slot already occupied")

  // Create or update boarding record
  let boarding = await VehicleBoarding.findOne({
    company: companyId,
    boardingTicketNumber: boardingTicketNumber,
    trip: tripId,
    isDeleted: false,
  })

  if (!boarding) {
    const trip = await Trip.findById(tripId).populate("vessel").populate("departurePort").populate("arrivalPort")

    boarding = new VehicleBoarding({
      company: companyId,
      checkin: checkin._id,
      trip: tripId,
      booking: booking._id,
      boardingTicketNumber,
      parkingSlot,
      boardingStatus: "Verified",
      vehicle: {
        registration: booking.vehicle?.registrationNumber,
        type: booking.vehicle?.vehicleType,
        make: booking.vehicle?.make,
        model: booking.vehicle?.model,
        color: booking.vehicle?.color,
        owner: {
          name: booking.owner?.name,
          contact: booking.owner?.contact,
          nationality: booking.owner?.nationality,
        },
      },
      tripInfo: {
        vessel: trip.vessel?.name,
        voyageNo: trip.tripCode,
        from: trip.departurePort?.name,
        to: trip.arrivalPort?.name,
        etd: trip.departureDateTime,
        eta: trip.arrivalDateTime,
      },
      boardingPassData: {
        qrCode: booking.boardingTicket?.qrCode,
        barcode: booking.boardingTicket?.barcode,
      },
      createdBy: userId,
    })
  } else {
    boarding.parkingSlot = parkingSlot
    boarding.boardingStatus = "Verified"
  }

  await boarding.save()
  return boarding
}

// Get vehicle boarding details
async function getBoardingDetails(companyId, boardingId) {
  const boarding = await VehicleBoarding.findOne({
    _id: boardingId,
    company: companyId,
    isDeleted: false,
  })
    .populate("checkin")
    .populate("booking")
    .populate("trip")

  if (!boarding) throw new Error("Boarding record not found")
  return boarding
}

// Confirm vehicle boarding
async function confirmBoarding(companyId, boardingId, userId) {
  const boarding = await VehicleBoarding.findOneAndUpdate(
    { _id: boardingId, company: companyId, isDeleted: false },
    {
      boardingStatus: "Boarded",
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

// Get vehicle manifest for trip
async function getVehicleManifest(companyId, tripId) {
  const boardings = await VehicleBoarding.find({
    company: companyId,
    trip: tripId,
    isDeleted: false,
  })
    .populate("vehicle")
    .sort({ parkingSlot: 1 })

  const manifest = {
    tripId,
    generatedAt: new Date(),
    totalVehicles: boardings.length,
    boarded: boardings.filter((b) => b.boardingStatus === "Boarded").length,
    verified: boardings.filter((b) => b.boardingStatus === "Verified").length,
    noShow: boardings.filter((b) => b.boardingStatus === "NoShow").length,
    vehicleList: boardings.map((b) => ({
      boardingId: b._id,
      boardingTicketNumber: b.boardingTicketNumber,
      parkingSlot: b.parkingSlot,
      registration: b.vehicle?.registration,
      type: b.vehicle?.type,
      owner: b.vehicle?.owner?.name,
      boardingStatus: b.boardingStatus,
      boardedAt: b.boardedAt,
    })),
  }

  return manifest
}

// Get vehicle boarding summary for trip
async function getBoardingSummary(companyId, tripId) {
  const trip = await Trip.findOne({ _id: tripId, company: companyId, isDeleted: false })
    .populate("vessel")
    .populate("departurePort")
    .populate("arrivalPort")

  if (!trip) throw new Error("Trip not found")

  const boardings = await VehicleBoarding.find({
    company: companyId,
    trip: tripId,
    isDeleted: false,
  })

  const summary = {
    trip: {
      tripCode: trip.tripCode,
      vessel: trip.vessel?.name,
      from: trip.departurePort?.name,
      to: trip.arrivalPort?.name,
      etd: trip.departureDateTime,
      eta: trip.arrivalDateTime,
    },
    boardingSummary: {
      total: boardings.length,
      boarded: boardings.filter((b) => b.boardingStatus === "Boarded").length,
      verified: boardings.filter((b) => b.boardingStatus === "Verified").length,
      pending: boardings.filter((b) => b.boardingStatus === "Pending").length,
      noShow: boardings.filter((b) => b.boardingStatus === "NoShow").length,
    },
    boardingPercentage:
      boardings.length > 0
        ? Math.round((boardings.filter((b) => b.boardingStatus === "Boarded").length / boardings.length) * 100)
        : 0,
    lastUpdated: new Date(),
  }

  return summary
}

module.exports = {
  getAvailableTripsForBoarding,
  initiateBoardingForTrip,
  scanBoardingTicket,
  getBoardingDetails,
  confirmBoarding,
  getVehicleManifest,
  getBoardingSummary,
}
