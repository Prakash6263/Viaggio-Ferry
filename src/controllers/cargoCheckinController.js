const createHttpError = require("http-errors")
const cargoCheckinService = require("../services/cargoCheckinService")

async function getAvailableTrips(req, res, next) {
  try {
    const companyId = req.user.company
    const trips = await cargoCheckinService.getAvailableTripsForCheckin(companyId)
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

    const checkin = await cargoCheckinService.initiateCargoCheckin(companyId, tripId, bookingId, userId)
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

    const checkin = await cargoCheckinService.scanCargoDocument(companyId, checkinId, documentNumber, userId)

    res.json({ data: checkin })
  } catch (err) {
    next(err)
  }
}

async function addManifestItem(req, res, next) {
  try {
    const companyId = req.user.company
    const { checkinId } = req.params
    const itemData = req.body
    const userId = req.user._id

    const checkin = await cargoCheckinService.addManifestItem(companyId, checkinId, itemData, userId)

    res.status(201).json({ data: checkin })
  } catch (err) {
    next(err)
  }
}

async function completeManifest(req, res, next) {
  try {
    const companyId = req.user.company
    const { checkinId } = req.params
    const userId = req.user._id

    const checkin = await cargoCheckinService.completeManifest(companyId, checkinId, userId)

    res.json({ data: checkin, message: "Cargo check-in completed successfully" })
  } catch (err) {
    next(err)
  }
}

async function getDetails(req, res, next) {
  try {
    const companyId = req.user.company
    const { checkinId } = req.params

    const checkin = await cargoCheckinService.getCheckinDetails(companyId, checkinId)

    res.json({ data: checkin })
  } catch (err) {
    next(err)
  }
}

module.exports = {
  getAvailableTrips,
  initiateCheckin,
  scanDocument,
  addManifestItem,
  completeManifest,
  getDetails,
}
