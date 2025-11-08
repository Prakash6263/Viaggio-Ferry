const createHttpError = require("http-errors")
const vehicleCheckinService = require("../services/vehicleCheckinService")

async function getAvailableTrips(req, res, next) {
  try {
    const companyId = req.user.company
    const trips = await vehicleCheckinService.getAvailableTripsForCheckin(companyId)
    res.json({ data: trips })
  } catch (err) {
    next(err)
  }
}

async function initiateCheckin(req, res, next) {
  try {
    const companyId = req.user.company
    const { tripId, bookingId } = req.body
    const userId = req.user._id

    if (!tripId || !bookingId) {
      throw new createHttpError.BadRequest("tripId and bookingId are required")
    }

    const checkin = await vehicleCheckinService.initiateVehicleCheckin(companyId, tripId, bookingId, userId)

    res.status(201).json({ data: checkin })
  } catch (err) {
    next(err)
  }
}

async function scanDocument(req, res, next) {
  try {
    const companyId = req.user.company
    const { checkinId, documentNumber } = req.body
    const userId = req.user._id

    const checkin = await vehicleCheckinService.scanVehicleDocument(companyId, checkinId, documentNumber, userId)

    res.json({ data: checkin, message: "Vehicle check-in completed successfully" })
  } catch (err) {
    next(err)
  }
}

async function getDetails(req, res, next) {
  try {
    const companyId = req.user.company
    const { checkinId } = req.params

    const checkin = await vehicleCheckinService.getCheckinDetails(companyId, checkinId)

    res.json({ data: checkin })
  } catch (err) {
    next(err)
  }
}

module.exports = {
  getAvailableTrips,
  initiateCheckin,
  scanDocument,
  getDetails,
}
