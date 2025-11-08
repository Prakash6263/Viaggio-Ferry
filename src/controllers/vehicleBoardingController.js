const createHttpError = require("http-errors")
const vehicleBoardingService = require("../services/vehicleBoardingService")

// Get available trips for vehicle boarding
async function getAvailableTrips(req, res, next) {
  try {
    const companyId = req.user.company
    const trips = await vehicleBoardingService.getAvailableTripsForBoarding(companyId)
    res.json({ data: trips })
  } catch (err) {
    next(err)
  }
}

// Initiate vehicle boarding for trip
async function initiateBoardingForTrip(req, res, next) {
  try {
    const companyId = req.user.company
    const { tripId } = req.body

    if (!tripId) {
      throw new createHttpError.BadRequest("tripId is required")
    }

    const boardingData = await vehicleBoardingService.initiateBoardingForTrip(companyId, tripId)
    res.json({ data: boardingData })
  } catch (err) {
    next(err)
  }
}

// Scan vehicle boarding ticket
async function scanBoardingTicket(req, res, next) {
  try {
    const companyId = req.user.company
    const { boardingTicketNumber, parkingSlot, tripId } = req.body
    const userId = req.user._id

    if (!boardingTicketNumber || !parkingSlot || !tripId) {
      throw new createHttpError.BadRequest("Missing required fields")
    }

    const boarding = await vehicleBoardingService.scanBoardingTicket(
      companyId,
      tripId,
      boardingTicketNumber,
      parkingSlot,
      userId,
    )

    res.json({ data: boarding })
  } catch (err) {
    next(err)
  }
}

// Get vehicle boarding details
async function getBoardingDetails(req, res, next) {
  try {
    const companyId = req.user.company
    const { boardingId } = req.params

    const boarding = await vehicleBoardingService.getBoardingDetails(companyId, boardingId)
    res.json({ data: boarding })
  } catch (err) {
    next(err)
  }
}

// Confirm vehicle boarding
async function confirmBoarding(req, res, next) {
  try {
    const companyId = req.user.company
    const { boardingId } = req.params
    const userId = req.user._id

    const boarding = await vehicleBoardingService.confirmBoarding(companyId, boardingId, userId)
    res.json({ data: boarding, message: "Vehicle boarded successfully" })
  } catch (err) {
    next(err)
  }
}

module.exports = {
  getAvailableTrips,
  initiateBoardingForTrip,
  scanBoardingTicket,
  getBoardingDetails,
  confirmBoarding,
}
