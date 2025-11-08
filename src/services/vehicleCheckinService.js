const VehicleCheckin = require("../models/VehicleCheckin")
const VehicleBooking = require("../models/VehicleBooking")
const Trip = require("../models/Trip")

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

async function initiateVehicleCheckin(companyId, tripId, bookingId, userId) {
  const booking = await VehicleBooking.findOne({
    _id: bookingId,
    company: companyId,
    bookingStatus: { $in: ["Confirmed", "CheckedIn"] },
    isDeleted: false,
  })

  if (!booking) throw new Error("Booking not found or not eligible for check-in")

  const trip = await Trip.findOne({ _id: tripId, company: companyId, isDeleted: false })
  if (!trip) throw new Error("Trip not found")

  let checkin = await VehicleCheckin.findOne({ booking: bookingId, isDeleted: false })

  if (!checkin) {
    checkin = await VehicleCheckin.create({
      company: companyId,
      booking: bookingId,
      trip: tripId,
      checkInStatus: "Pending",
      createdBy: userId,
      checkInStartedAt: new Date(),
      vehicle: {
        vehicleType: booking.vehicleType,
        registrationNumber: booking.registrationNumber,
        make: booking.make,
        model: booking.model,
        year: booking.year,
        color: booking.color,
        vin: booking.vin,
        owner: booking.owner,
        dimensions: booking.dimensions,
        weight: booking.weight,
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

async function scanVehicleDocument(companyId, checkinId, documentNumber, userId) {
  const checkin = await VehicleCheckin.findOneAndUpdate(
    { _id: checkinId, company: companyId, isDeleted: false },
    {
      "documentScanData.documentNumber": documentNumber,
      "documentScanData.documentType": "RegistrationCertificate",
      "documentScanData.scannedAt": new Date(),
      "documentScanData.scannedBy": userId,
      checkInStatus: "VerificationComplete",
      documentVerifiedAt: new Date(),
      checkInCompletedAt: new Date(),
      checkedInBy: userId,
    },
    { new: true },
  )

  if (!checkin) throw new Error("Check-in record not found")

  // Update booking status
  await VehicleBooking.findByIdAndUpdate(checkin.booking, {
    bookingStatus: "CheckedIn",
    checkInDateTime: new Date(),
  })

  return checkin
}

async function getCheckinDetails(companyId, checkinId) {
  const checkin = await VehicleCheckin.findOne({
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
  initiateVehicleCheckin,
  scanVehicleDocument,
  getCheckinDetails,
}
