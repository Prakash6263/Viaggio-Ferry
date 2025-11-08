const createHttpError = require("http-errors")
const PassengerBooking = require("../models/PassengerBooking")
const Trip = require("../models/Trip")
const Port = require("../models/Port")
const Cabin = require("../models/Cabin")
const mongoose = require("mongoose")

// Search available trips and bookings
async function search(req, res, next) {
  try {
    const {
      originPort,
      destinationPort,
      departureDate,
      returnDate,
      cabin,
      visaType,
      bookingType,
      adultsCount,
      childrenCount,
      infantsCount,
      page = 1,
      limit = 10,
    } = req.query

    const filter = {
      company: req.user.company,
      isDeleted: false,
    }

    if (originPort) filter.originPort = originPort
    if (destinationPort) filter.destinationPort = destinationPort
    if (departureDate) {
      const date = new Date(departureDate)
      filter.departureDate = {
        $gte: new Date(date.setHours(0, 0, 0, 0)),
        $lte: new Date(date.setHours(23, 59, 59, 999)),
      }
    }
    if (cabin) filter.cabin = cabin
    if (visaType) filter.visaType = visaType
    if (bookingType) filter.bookingType = bookingType

    const skip = (Number.parseInt(page) - 1) * Number.parseInt(limit)
    const bookings = await PassengerBooking.find(filter)
      .populate("originPort destinationPort cabin outboundTrip currency")
      .skip(skip)
      .limit(Number.parseInt(limit))
      .sort({ createdAt: -1 })

    const total = await PassengerBooking.countDocuments(filter)

    res.json({
      data: bookings,
      pagination: {
        page: Number.parseInt(page),
        limit: Number.parseInt(limit),
        total,
        pages: Math.ceil(total / Number.parseInt(limit)),
      },
    })
  } catch (err) {
    next(err)
  }
}

// Create new passenger booking
async function create(req, res, next) {
  try {
    const {
      originPort,
      destinationPort,
      outboundTrip,
      returnTrip,
      departureDate,
      returnDate,
      bookingType,
      cabin,
      visaType,
      currency,
      passengers,
      bookingAgent,
      b2cCustomer,
      bookingSource,
      specialRequirements,
      remarks,
    } = req.body

    const trip = await Trip.findOne({ _id: outboundTrip, company: req.user.company })
    if (!trip) throw new createHttpError.NotFound("Trip not found")

    // Generate booking reference
    const bookingRef = `PB-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`

    // Calculate passenger counts
    let adultsCount = 0,
      childrenCount = 0,
      infantsCount = 0
    passengers.forEach((p) => {
      if (p.passengerType === "Adult") adultsCount++
      else if (p.passengerType === "Child") childrenCount++
      else if (p.passengerType === "Infant") infantsCount++
    })

    const booking = new PassengerBooking({
      company: req.user.company,
      bookingReference: bookingRef,
      originPort,
      destinationPort,
      outboundTrip,
      returnTrip: bookingType === "Return" ? returnTrip : null,
      departureDate,
      returnDate: bookingType === "Return" ? returnDate : null,
      bookingType,
      cabin,
      visaType,
      passengers: passengers.map((p) => ({
        _id: new mongoose.Types.ObjectId(),
        ...p,
      })),
      adultsCount,
      childrenCount,
      infantsCount,
      currency,
      bookingAgent: bookingAgent || null,
      b2cCustomer: b2cCustomer || null,
      bookingSource,
      specialRequirements,
      remarks,
      createdBy: req.user.id,
      baseFare: req.body.baseFare || 0,
      totalFare: req.body.totalFare || 0,
    })

    await booking.save()

    res.status(201).json({
      message: "Passenger booking created successfully",
      booking,
    })
  } catch (err) {
    next(err)
  }
}

// Get booking by ID
async function getOne(req, res, next) {
  try {
    const booking = await PassengerBooking.findOne({
      _id: req.params.id,
      company: req.user.company,
      isDeleted: false,
    }).populate("originPort destinationPort cabin outboundTrip returnTrip currency createdBy")

    if (!booking) throw new createHttpError.NotFound("Booking not found")

    res.json(booking)
  } catch (err) {
    next(err)
  }
}

// Update booking
async function update(req, res, next) {
  try {
    const { bookingStatus, visaType, specialRequirements, remarks, passengers } = req.body

    const booking = await PassengerBooking.findOne({
      _id: req.params.id,
      company: req.user.company,
      isDeleted: false,
    })

    if (!booking) throw new createHttpError.NotFound("Booking not found")

    if (bookingStatus) booking.bookingStatus = bookingStatus
    if (visaType) booking.visaType = visaType
    if (specialRequirements) booking.specialRequirements = specialRequirements
    if (remarks) booking.remarks = remarks
    if (passengers) {
      booking.passengers = passengers.map((p) => ({
        _id: p._id || new mongoose.Types.ObjectId(),
        ...p,
      }))
      booking.adultsCount = passengers.filter((p) => p.passengerType === "Adult").length
      booking.childrenCount = passengers.filter((p) => p.passengerType === "Child").length
      booking.infantsCount = passengers.filter((p) => p.passengerType === "Infant").length
    }

    await booking.save()

    res.json({
      message: "Booking updated successfully",
      booking,
    })
  } catch (err) {
    next(err)
  }
}

// Check in passengers
async function checkIn(req, res, next) {
  try {
    const booking = await PassengerBooking.findOne({
      _id: req.params.id,
      company: req.user.company,
      isDeleted: false,
    })

    if (!booking) throw new createHttpError.NotFound("Booking not found")
    if (booking.bookingStatus !== "Confirmed")
      throw new createHttpError.BadRequest("Booking must be confirmed to check in")

    booking.bookingStatus = "CheckedIn"
    booking.checkInDateTime = new Date()
    await booking.save()

    res.json({
      message: "Passengers checked in successfully",
      booking,
    })
  } catch (err) {
    next(err)
  }
}

// Board passengers
async function board(req, res, next) {
  try {
    const booking = await PassengerBooking.findOne({
      _id: req.params.id,
      company: req.user.company,
      isDeleted: false,
    })

    if (!booking) throw new createHttpError.NotFound("Booking not found")
    if (booking.bookingStatus !== "CheckedIn")
      throw new createHttpError.BadRequest("Passengers must be checked in before boarding")

    booking.bookingStatus = "Boarded"
    booking.boardingDateTime = new Date()
    await booking.save()

    res.json({
      message: "Passengers boarded successfully",
      booking,
    })
  } catch (err) {
    next(err)
  }
}

// Cancel booking
async function cancel(req, res, next) {
  try {
    const { cancellationReason } = req.body

    const booking = await PassengerBooking.findOne({
      _id: req.params.id,
      company: req.user.company,
      isDeleted: false,
    })

    if (!booking) throw new createHttpError.NotFound("Booking not found")

    booking.bookingStatus = "Cancelled"
    booking.cancelledDateTime = new Date()
    booking.cancellationReason = cancellationReason
    await booking.save()

    res.json({
      message: "Booking cancelled successfully",
      booking,
    })
  } catch (err) {
    next(err)
  }
}

// Soft delete
async function remove(req, res, next) {
  try {
    const booking = await PassengerBooking.findOne({
      _id: req.params.id,
      company: req.user.company,
      isDeleted: false,
    })

    if (!booking) throw new createHttpError.NotFound("Booking not found")

    booking.isDeleted = true
    await booking.save()

    res.json({ message: "Booking deleted successfully" })
  } catch (err) {
    next(err)
  }
}

module.exports = {
  search,
  create,
  getOne,
  update,
  checkIn,
  board,
  cancel,
  remove,
}
