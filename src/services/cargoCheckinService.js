const CargoCheckin = require("../models/CargoCheckin")
const CargoBooking = require("../models/CargoBooking")
const Trip = require("../models/Trip")
const mongoose = require("mongoose")

async function getAvailableTripsForCheckin(companyId) {
  const trips = await Trip.find({
    company: companyId,
    status: { $in: ["Scheduled", "In Progress"] },
    checkInOpeningDate: { $lte: new Date() },
    checkInClosingDate: { $gte: new Date() },
    isDeleted: false,
  })
    .select("_id tripCode vessel departurePort arrivalPort departureDateTime arrivalDateTime")
    .populate("vessel", "name vesselCode")
    .populate("departurePort", "name portCode")
    .populate("arrivalPort", "name portCode")
    .sort({ departureDateTime: 1 })

  return trips
}

async function initiateCargoCheckin(companyId, tripId, bookingId, userId) {
  const booking = await CargoBooking.findOne({
    _id: bookingId,
    company: companyId,
    bookingStatus: { $in: ["Confirmed", "CheckedIn"] },
    isDeleted: false,
  })

  if (!booking) throw new Error("Booking not found or not eligible for check-in")

  const trip = await Trip.findOne({ _id: tripId, company: companyId, isDeleted: false })
  if (!trip) throw new Error("Trip not found")

  let checkin = await CargoCheckin.findOne({ booking: bookingId, isDeleted: false })

  if (!checkin) {
    checkin = await CargoCheckin.create({
      company: companyId,
      booking: bookingId,
      trip: tripId,
      checkInStatus: "Pending",
      createdBy: userId,
      checkInStartedAt: new Date(),
      cargo: {
        cargoType: booking.cargoType,
        description: booking.description,
        totalQuantity: booking.quantity,
        totalWeight: booking.totalWeight,
        shipper: booking.shipper,
        receiver: booking.receiver,
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

async function scanCargoDocument(companyId, checkinId, documentNumber, userId) {
  const checkin = await CargoCheckin.findOneAndUpdate(
    { _id: checkinId, company: companyId, isDeleted: false },
    {
      "documentScanData.documentNumber": documentNumber,
      "documentScanData.documentType": "BillOfLading",
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

async function addManifestItem(companyId, checkinId, itemData, userId) {
  const manifestItem = {
    _id: new mongoose.Types.ObjectId(),
    itemNo: itemData.itemNo,
    description: itemData.description,
    quantity: itemData.quantity,
    weight: itemData.weight,
    dimensions: itemData.dimensions,
    markingNo: itemData.markingNo,
    status: "Added",
    addedAt: new Date(),
  }

  const checkin = await CargoCheckin.findOneAndUpdate(
    { _id: checkinId, company: companyId, isDeleted: false },
    {
      $push: { manifestItems: manifestItem },
    },
    { new: true },
  )

  if (!checkin) throw new Error("Check-in record not found")
  return checkin
}

async function completeManifest(companyId, checkinId, userId) {
  const checkin = await CargoCheckin.findOneAndUpdate(
    { _id: checkinId, company: companyId, isDeleted: false },
    {
      $set: {
        "manifestItems.$[].status": "Verified",
        checkInStatus: "CheckInComplete",
        manifestCompletedAt: new Date(),
        checkInCompletedAt: new Date(),
        checkedInBy: userId,
      },
    },
    { new: true },
  )

  if (!checkin) throw new Error("Check-in record not found")

  // Update booking status
  await CargoBooking.findByIdAndUpdate(checkin.booking, {
    bookingStatus: "CheckedIn",
    checkInDateTime: new Date(),
  })

  return checkin
}

async function getCheckinDetails(companyId, checkinId) {
  const checkin = await CargoCheckin.findOne({
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
  initiateCargoCheckin,
  scanCargoDocument,
  addManifestItem,
  completeManifest,
  getCheckinDetails,
}
