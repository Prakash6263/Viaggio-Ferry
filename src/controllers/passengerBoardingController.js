const createHttpError = require("http-errors")
const passengerBoardingService = require("../services/passengerBoardingService")

// Get available trips for boarding
async function getAvailableTrips(req, res, next) {
  try {
    const companyId = req.user.company
    const trips = await passengerBoardingService.getAvailableTripsForBoarding(companyId)
    res.json({ data: trips })
  } catch (err) {
    next(err)
  }
}

// Initiate boarding for trip
async function initiateBoardingForTrip(req, res, next) {
  try {
    const companyId = req.user.company
    const { tripId } = req.body

    if (!tripId) {
      throw new createHttpError.BadRequest("tripId is required")
    }

    const boardingData = await passengerBoardingService.initiateBoardingForTrip(companyId, tripId)
    res.json({ data: boardingData })
  } catch (err) {
    next(err)
  }
}

// Scan boarding pass and seat
async function scanBoardingPass(req, res, next) {
  try {
    const companyId = req.user.company
    const { boardingPassNumber, seatNumber, tripId } = req.body
    const userId = req.user._id

    if (!boardingPassNumber || !seatNumber || !tripId) {
      throw new createHttpError.BadRequest("Missing required fields")
    }

    const boarding = await passengerBoardingService.scanBoardingPass(
      companyId,
      tripId,
      boardingPassNumber,
      seatNumber,
      userId,
    )

    res.json({ data: boarding })
  } catch (err) {
    next(err)
  }
}

// Get boarding pass details
async function getBoardingPassDetails(req, res, next) {
  try {
    const companyId = req.user.company
    const { boardingId } = req.params

    const boarding = await passengerBoardingService.getBoardingDetails(companyId, boardingId)
    res.json({ data: boarding })
  } catch (err) {
    next(err)
  }
}

// Confirm boarding
async function confirmBoarding(req, res, next) {
  try {
    const companyId = req.user.company
    const { boardingId } = req.params
    const userId = req.user._id

    const boarding = await passengerBoardingService.confirmBoarding(companyId, boardingId, userId)
    res.json({ data: boarding, message: "Passenger boarded successfully" })
  } catch (err) {
    next(err)
  }
}

// Get passenger manifest for trip
async function getPassengerManifest(req, res, next) {
  try {
    const companyId = req.user.company
    const { tripId } = req.params
    const { manifestType = "standard" } = req.query

    const manifest = await passengerBoardingService.getPassengerManifest(companyId, tripId, manifestType)
    res.json({ data: manifest })
  } catch (err) {
    next(err)
  }
}

// Get luggage data for trip
async function getLuggageData(req, res, next) {
  try {
    const companyId = req.user.company
    const { tripId } = req.params

    const luggageData = await passengerBoardingService.getLuggageDataForTrip(companyId, tripId)
    res.json({ data: luggageData })
  } catch (err) {
    next(err)
  }
}

// Get boarding summary for trip
async function getBoardingSummary(req, res, next) {
  try {
    const companyId = req.user.company
    const { tripId } = req.params

    const summary = await passengerBoardingService.getBoardingSummary(companyId, tripId)
    res.json({ data: summary })
  } catch (err) {
    next(err)
  }
}

module.exports = {
  getAvailableTrips,
  initiateBoardingForTrip,
  scanBoardingPass,
  getBoardingPassDetails,
  confirmBoarding,
  getPassengerManifest,
  getLuggageData,
  getBoardingSummary,
}
