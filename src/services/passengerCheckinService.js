const mongoose = require("mongoose")
const PassengerCheckin = require("../models/PassengerCheckin")
const PassengerBooking = require("../models/PassengerBooking")
const Trip = require("../models/Trip")

// Get trips available for check-in
async function getAvailableTripsForCheckin(companyId) {
  const trips = await Trip.find({
    company: companyId,
    status: { $in: ["Scheduled", "In Progress"] },
    checkInOpeningDate: { $lte: new Date() },
    checkInClosingDate: { $gte: new Date() },
    isDeleted: false,
  })
    .select("_id tripCode vessel departurePort arrivalPort departureDateTime arrivalDateTime status")
    .populate("vessel", "name vesselCode")
    .populate("departurePort", "name portCode")
    .populate("arrivalPort", "name portCode")
    .sort({ departureDateTime: 1 })

  return trips
}

// Initiate check-in for a passenger
async function initiatePassengerCheckin(companyId, tripId, bookingId, userId) {
  const booking = await PassengerBooking.findOne({
    _id: bookingId,
    company: companyId,
    bookingStatus: { $in: ["Confirmed", "CheckedIn"] },
    isDeleted: false,
  })

  if (!booking) throw new Error("Booking not found or not eligible for check-in")

  const trip = await Trip.findOne({ _id: tripId, company: companyId, isDeleted: false })
  if (!trip) throw new Error("Trip not found")

  let checkin = await PassengerCheckin.findOne({ booking: bookingId, isDeleted: false })

  if (!checkin) {
    checkin = await PassengerCheckin.create({
      company: companyId,
      booking: bookingId,
      trip: tripId,
      checkInStatus: "Pending",
      createdBy: userId,
      checkInStartedAt: new Date(),
      passenger: {
        passengerName: booking.passengers[0]?.passengerName,
        nationality: booking.passengers[0]?.nationality,
        passportNumber: booking.passengers[0]?.visaDetails,
        passengerType: booking.passengers[0]?.passengerType,
      },
      tripDetails: {
        vessel: trip.vessel.toString(),
        voyageNo: trip.tripCode,
        from: trip.departurePort.toString(),
        to: trip.arrivalPort.toString(),
        etd: trip.departureDateTime,
        eta: trip.arrivalDateTime,
      },
    })
  }

  return checkin
}

// Scan and verify passenger document
async function scanPassengerDocument(companyId, checkinId, documentNumber, userId) {
  const checkin = await PassengerCheckin.findOneAndUpdate(
    { _id: checkinId, company: companyId, isDeleted: false },
    {
      "documentScanData.documentNumber": documentNumber,
      "documentScanData.documentType": "Passport",
      "documentScanData.scannedAt": new Date(),
      "documentScanData.scannedBy": userId,
      checkInStatus: "DocumentScanned",
      documentVerifiedAt: new Date(),
    },
    { new: true },
  )

  if (!checkin) throw new Error("Check-in record not found")
  return checkin
}

// Add luggage item
async function addLuggageItem(companyId, checkinId, luggageData, userId) {
  const luggageItem = {
    _id: new mongoose.Types.ObjectId(),
    ...luggageData,
    status: "Added",
    addedAt: new Date(),
  }

  const checkin = await PassengerCheckin.findOneAndUpdate(
    { _id: checkinId, company: companyId, isDeleted: false },
    {
      $push: { luggage: luggageItem },
      $inc: { totalActualWeight: luggageData.actualWeight || 0 },
    },
    { new: true },
  )

  if (!checkin) throw new Error("Check-in record not found")
  return checkin
}

// Remove luggage item
async function removeLuggageItem(companyId, checkinId, luggageId, userId) {
  const checkin = await PassengerCheckin.findOne({
    _id: checkinId,
    company: companyId,
    isDeleted: false,
  })

  if (!checkin) throw new Error("Check-in record not found")

  const luggage = checkin.luggage.find((l) => l._id.toString() === luggageId)
  if (luggage) {
    checkin.totalActualWeight -= luggage.actualWeight || 0
  }

  checkin.luggage = checkin.luggage.filter((l) => l._id.toString() !== luggageId)
  return checkin.save()
}

// Confirm luggage
async function confirmLuggage(companyId, checkinId, userId) {
  const checkin = await PassengerCheckin.findOneAndUpdate(
    { _id: checkinId, company: companyId, isDeleted: false },
    {
      $set: {
        "luggage.$[].status": "Confirmed",
        checkInStatus: "LuggageComplete",
        luggageCompletedAt: new Date(),
      },
    },
    { new: true },
  )

  if (!checkin) throw new Error("Check-in record not found")
  return checkin
}

// Create excess luggage ticket and process payment
async function createExcessLuggageTicket(companyId, checkinId, ticketData, userId) {
  const checkin = await PassengerCheckin.findOne({
    _id: checkinId,
    company: companyId,
    isDeleted: false,
  })

  if (!checkin) throw new Error("Check-in record not found")

  const excessTicketData = {
    ticketNumber: `EXC-${Date.now()}`,
    excessWeight: ticketData.excessWeight,
    feePerKg: ticketData.feePerKg,
    totalFee: ticketData.excessWeight * ticketData.feePerKg,
    currency: ticketData.currency,
    paymentMethod: ticketData.paymentMethod,
    paymentStatus: "Pending",
    transactionNumber: ticketData.transactionNumber,
  }

  checkin.excessLuggageTicket = excessTicketData
  return checkin.save()
}

// Confirm excess luggage payment
async function confirmExcessLuggagePayment(companyId, checkinId, userId) {
  const checkin = await PassengerCheckin.findOneAndUpdate(
    { _id: checkinId, company: companyId, isDeleted: false },
    {
      "excessLuggageTicket.paymentStatus": "Paid",
      "excessLuggageTicket.paymentConfirmedAt": new Date(),
      "excessLuggageTicket.paymentConfirmedBy": userId,
      checkInStatus: "CheckInComplete",
      checkInCompletedAt: new Date(),
      checkedInBy: userId,
    },
    { new: true },
  )

  if (!checkin) throw new Error("Check-in record not found")

  // Update booking status
  await PassengerBooking.findByIdAndUpdate(checkin.booking, {
    bookingStatus: "CheckedIn",
    checkInDateTime: new Date(),
  })

  return checkin
}

// Get check-in details
async function getCheckinDetails(companyId, checkinId) {
  const checkin = await PassengerCheckin.findOne({
    _id: checkinId,
    company: companyId,
    isDeleted: false,
  })
    .populate("booking")
    .populate("trip")

  if (!checkin) throw new Error("Check-in record not found")
  return checkin
}

module.exports = {
  getAvailableTripsForCheckin,
  initiatePassengerCheckin,
  scanPassengerDocument,
  addLuggageItem,
  removeLuggageItem,
  confirmLuggage,
  createExcessLuggageTicket,
  confirmExcessLuggagePayment,
  getCheckinDetails,
}
