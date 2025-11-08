const createHttpError = require("http-errors")
const cargoBoardingService = require("../services/cargoBoardingService")

// Get available trips for cargo boarding
async function getAvailableTrips(req, res, next) {
  try {
    const companyId = req.user.company
    const trips = await cargoBoardingService.getAvailableTripsForBoarding(companyId)
    res.json({ data: trips })
  } catch (err) {
    next(err)
  }
}

// Initiate cargo boarding for trip
async function initiateBoardingForTrip(req, res, next) {
  try {
    const companyId = req.user.company
    const { tripId } = req.body

    if (!tripId) {
      throw new createHttpError.BadRequest("tripId is required")
    }

    const boardingData = await cargoBoardingService.initiateBoardingForTrip(companyId, tripId)
    res.json({ data: boardingData })
  } catch (err) {
    next(err)
  }
}

// Scan cargo manifest
async function scanManifest(req, res, next) {
  try {
    const companyId = req.user.company
    const { manifestNumber, tripId } = req.body
    const userId = req.user._id

    if (!manifestNumber || !tripId) {
      throw new createHttpError.BadRequest("Missing required fields")
    }

    const boarding = await cargoBoardingService.scanManifest(companyId, tripId, manifestNumber, userId)
    res.json({ data: boarding })
  } catch (err) {
    next(err)
  }
}

// Update item loading status
async function updateItemLoading(req, res, next) {
  try {
    const companyId = req.user.company
    const { boardingId, itemId } = req.params
    const { loadedQuantity, loadedWeight } = req.body
    const userId = req.user._id

    if (loadedQuantity === undefined || loadedWeight === undefined) {
      throw new createHttpError.BadRequest("loadedQuantity and loadedWeight are required")
    }

    const boarding = await cargoBoardingService.updateItemLoading(
      companyId,
      boardingId,
      itemId,
      { loadedQuantity, loadedWeight },
      userId,
    )

    res.json({ data: boarding })
  } catch (err) {
    next(err)
  }
}

// Complete cargo boarding
async function completeBoardingForCargo(req, res, next) {
  try {
    const companyId = req.user.company
    const { boardingId } = req.params
    const userId = req.user._id

    const boarding = await cargoBoardingService.completeBoardingForCargo(companyId, boardingId, userId)
    res.json({ data: boarding, message: "Cargo boarding completed successfully" })
  } catch (err) {
    next(err)
  }
}

// Get cargo manifest
async function getCargoManifest(req, res, next) {
  try {
    const companyId = req.user.company
    const { tripId } = req.params

    const manifest = await cargoBoardingService.getCargoManifest(companyId, tripId)
    res.json({ data: manifest })
  } catch (err) {
    next(err)
  }
}

module.exports = {
  getAvailableTrips,
  initiateBoardingForTrip,
  scanManifest,
  updateItemLoading,
  completeBoardingForCargo,
  getCargoManifest,
}
