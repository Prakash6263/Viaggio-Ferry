const createHttpError = require("http-errors")
const passengerCheckinService = require("../services/passengerCheckinService")

// Get available trips for check-in
async function getAvailableTrips(req, res, next) {
  try {
    const companyId = req.user.company
    const trips = await passengerCheckinService.getAvailableTripsForCheckin(companyId)
    res.json({ data: trips })
  } catch (err) {
    next(err)
  }
}

// Initiate check-in
async function initiateCheckin(req, res, next) {
  try {
    const companyId = req.user.company
    const { tripId, bookingId } = req.body
    const userId = req.user._id

    if (!tripId || !bookingId) {
      throw new createHttpError.BadRequest("tripId and bookingId are required")
    }

    const checkin = await passengerCheckinService.initiatePassengerCheckin(companyId, tripId, bookingId, userId)

    res.status(201).json({ data: checkin })
  } catch (err) {
    next(err)
  }
}

// Scan document
async function scanDocument(req, res, next) {
  try {
    const companyId = req.user.company
    const { checkinId, documentNumber } = req.body
    const userId = req.user._id

    if (!checkinId || !documentNumber) {
      throw new createHttpError.BadRequest("checkinId and documentNumber are required")
    }

    const checkin = await passengerCheckinService.scanPassengerDocument(companyId, checkinId, documentNumber, userId)

    res.json({ data: checkin })
  } catch (err) {
    next(err)
  }
}

// Add luggage
async function addLuggage(req, res, next) {
  try {
    const companyId = req.user.company
    const { checkinId } = req.params
    const { luggageLabel, trolleyNo, allowedWeight, actualWeight } = req.body
    const userId = req.user._id

    if (!checkinId || !luggageLabel || actualWeight === undefined) {
      throw new createHttpError.BadRequest("Missing required fields")
    }

    const checkin = await passengerCheckinService.addLuggageItem(
      companyId,
      checkinId,
      { luggageLabel, trolleyNo, allowedWeight, actualWeight },
      userId,
    )

    res.status(201).json({ data: checkin })
  } catch (err) {
    next(err)
  }
}

// Remove luggage
async function removeLuggage(req, res, next) {
  try {
    const companyId = req.user.company
    const { checkinId, luggageId } = req.params
    const userId = req.user._id

    if (!checkinId || !luggageId) {
      throw new createHttpError.BadRequest("checkinId and luggageId are required")
    }

    const checkin = await passengerCheckinService.removeLuggageItem(companyId, checkinId, luggageId, userId)

    res.json({ data: checkin })
  } catch (err) {
    next(err)
  }
}

// Confirm luggage
async function confirmLuggage(req, res, next) {
  try {
    const companyId = req.user.company
    const { checkinId } = req.params
    const userId = req.user._id

    const checkin = await passengerCheckinService.confirmLuggage(companyId, checkinId, userId)

    res.json({ data: checkin })
  } catch (err) {
    next(err)
  }
}

// Create excess luggage ticket
async function createExcessTicket(req, res, next) {
  try {
    const companyId = req.user.company
    const { checkinId } = req.params
    const { excessWeight, feePerKg, currency, paymentMethod, transactionNumber } = req.body
    const userId = req.user._id

    if (!excessWeight || !feePerKg) {
      throw new createHttpError.BadRequest("excessWeight and feePerKg are required")
    }

    const checkin = await passengerCheckinService.createExcessLuggageTicket(
      companyId,
      checkinId,
      { excessWeight, feePerKg, currency, paymentMethod, transactionNumber },
      userId,
    )

    res.status(201).json({ data: checkin })
  } catch (err) {
    next(err)
  }
}

// Confirm excess luggage payment
async function confirmPayment(req, res, next) {
  try {
    const companyId = req.user.company
    const { checkinId } = req.params
    const userId = req.user._id

    const checkin = await passengerCheckinService.confirmExcessLuggagePayment(companyId, checkinId, userId)

    res.json({ data: checkin, message: "Check-in completed successfully" })
  } catch (err) {
    next(err)
  }
}

// Get check-in details
async function getDetails(req, res, next) {
  try {
    const companyId = req.user.company
    const { checkinId } = req.params

    const checkin = await passengerCheckinService.getCheckinDetails(companyId, checkinId)

    res.json({ data: checkin })
  } catch (err) {
    next(err)
  }
}

module.exports = {
  getAvailableTrips,
  initiateCheckin,
  scanDocument,
  addLuggage,
  removeLuggage,
  confirmLuggage,
  createExcessTicket,
  confirmPayment,
  getDetails,
}
