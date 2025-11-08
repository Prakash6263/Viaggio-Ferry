const mongoose = require("mongoose")
const PassengerBoarding = require("../models/PassengerBoarding")
const PassengerCheckin = require("../models/PassengerCheckin")
const PassengerBooking = require("../models/PassengerBooking")
const Trip = require("../models/Trip")

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

async function initiateBoardingForTrip(companyId, tripId) {
  const trip = await Trip.findOne({ _id: tripId, company: companyId, isDeleted: false })
  if (!trip) throw new Error("Trip not found")

  // Get all checked-in passengers for this trip
  const checkins = await PassengerCheckin.find({
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
    totalPassengers: checkins.length,
    boardedCount: 0,
    noShowCount: 0,
    checkins: checkins.map((c) => ({
      checkinId: c._id,
      bookingId: c.booking?._id,
      passengerName: c.passenger?.passengerName,
      status: "Pending",
    })),
    initiatedAt: new Date(),
  }

  return boardingData
}

async function scanBoardingPass(companyId, tripId, boardingPassNumber, seatNumber, userId) {
  // Find passenger booking with this boarding pass
  const booking = await PassengerBooking.findOne({
    company: companyId,
    "boardingPass.boardingPassNumber": boardingPassNumber,
    isDeleted: false,
  })

  if (!booking) throw new Error("Boarding pass not found")

  // Get passenger check-in record
  const checkin = await PassengerCheckin.findOne({
    company: companyId,
    booking: booking._id,
    trip: tripId,
    checkInStatus: "CheckInComplete",
    isDeleted: false,
  })

  if (!checkin) throw new Error("Check-in record not found for this trip")

  // Check if seat is already taken
  const existingBoarding = await PassengerBoarding.findOne({
    company: companyId,
    trip: tripId,
    seatNumber: seatNumber,
    boardingStatus: { $in: ["Verified", "Boarded"] },
    isDeleted: false,
  })

  if (existingBoarding) throw new Error("Seat already occupied")

  // Create or update boarding record
  let boarding = await PassengerBoarding.findOne({
    company: companyId,
    boardingPassNumber: boardingPassNumber,
    trip: tripId,
    isDeleted: false,
  })

  if (!boarding) {
    boarding = new PassengerBoarding({
      company: companyId,
      checkin: checkin._id,
      trip: tripId,
      booking: booking._id,
      boardingPassNumber,
      seatNumber,
      boardingStatus: "Verified",
      passenger: {
        name: booking.passengers?.[0]?.passengerName,
        nationality: booking.passengers?.[0]?.nationality,
        passportNo: booking.passengers?.[0]?.passportNumber,
        expiryDate: booking.passengers?.[0]?.expiryDate,
        email: booking.email,
      },
      ticket: {
        ticketNo: booking.ticketNumber,
        cabin: booking.cabin?.toString(),
        cabinType: booking.cabinType,
        ticketType: booking.ticketType,
      },
      createdBy: userId,
    })
  } else {
    boarding.seatNumber = seatNumber
    boarding.boardingStatus = "Verified"
  }

  const trip = await Trip.findById(tripId)
  await boarding.save()
  return boarding
}

async function getBoardingDetails(companyId, boardingId) {
  const boarding = await PassengerBoarding.findOne({
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

async function confirmBoarding(companyId, boardingId, userId) {
  const boarding = await PassengerBoarding.findOneAndUpdate(
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

async function getPassengerManifest(companyId, tripId, manifestType = "standard") {
  const boardings = await PassengerBoarding.find({
    company: companyId,
    trip: tripId,
    isDeleted: false,
  })
    .populate("passenger")
    .sort({ seatNumber: 1 })

  const manifest = {
    tripId,
    manifestType,
    generatedAt: new Date(),
    totalPassengers: boardings.length,
    boarded: boardings.filter((b) => b.boardingStatus === "Boarded").length,
    verified: boardings.filter((b) => b.boardingStatus === "Verified").length,
    noShow: boardings.filter((b) => b.boardingStatus === "NoShow").length,
  }

  if (manifestType === "standard") {
    manifest.passengers = boardings.map((b) => ({
      seatNumber: b.seatNumber,
      name: b.passenger?.name,
      nationality: b.passenger?.nationality,
      ticketNo: b.ticket?.ticketNo,
      boardingStatus: b.boardingStatus,
    }))
  } else if (manifestType === "detailed") {
    manifest.passengers = boardings.map((b) => ({
      boardingId: b._id,
      seatNumber: b.seatNumber,
      passenger: b.passenger,
      ticket: b.ticket,
      boardingStatus: b.boardingStatus,
      boardedAt: b.boardedAt,
    }))
  }

  return manifest
}

async function getLuggageDataForTrip(companyId, tripId) {
  const checkins = await PassengerCheckin.find({
    company: companyId,
    trip: tripId,
    checkInStatus: "CheckInComplete",
    isDeleted: false,
  })

  let totalItems = 0
  let totalWeight = 0
  let excessFees = 0

  checkins.forEach((checkin) => {
    if (checkin.luggage) {
      totalItems += checkin.luggage.length
      totalWeight += checkin.totalActualWeight || 0
    }
    if (checkin.excessLuggageTicket?.paymentStatus === "Paid") {
      excessFees += checkin.excessLuggageTicket.totalFee || 0
    }
  })

  return {
    tripId,
    totalPassengers: checkins.length,
    totalItems,
    totalWeight: Math.round(totalWeight * 100) / 100,
    excessFeeCollected: excessFees,
    currency: checkins[0]?.excessLuggageTicket?.currency || "USD",
  }
}

async function getBoardingSummary(companyId, tripId) {
  const trip = await Trip.findOne({ _id: tripId, company: companyId, isDeleted: false })
    .populate("vessel")
    .populate("departurePort")
    .populate("arrivalPort")

  if (!trip) throw new Error("Trip not found")

  const boardings = await PassengerBoarding.find({
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
  scanBoardingPass,
  getBoardingDetails,
  confirmBoarding,
  getPassengerManifest,
  getLuggageDataForTrip,
  getBoardingSummary,
}
