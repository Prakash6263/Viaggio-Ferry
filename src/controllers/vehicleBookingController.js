const createHttpError = require("http-errors")
const VehicleBooking = require("../models/VehicleBooking")
const Trip = require("../models/Trip")

async function search(req, res, next) {
  try {
    const {
      originPort,
      destinationPort,
      departureDate,
      vehicleType,
      visaType,
      bookingType,
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
    if (vehicleType) filter.vehicleType = vehicleType
    if (visaType) filter.visaType = visaType
    if (bookingType) filter.bookingType = bookingType

    const skip = (Number.parseInt(page) - 1) * Number.parseInt(limit)
    const bookings = await VehicleBooking.find(filter)
      .populate("originPort destinationPort outboundTrip currency")
      .skip(skip)
      .limit(Number.parseInt(limit))
      .sort({ createdAt: -1 })

    const total = await VehicleBooking.countDocuments(filter)

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
      vehicleType,
      visaType,
      vehicleRegistration,
      vehicleModel,
      vehicleColor,
      ownerName,
      ownerContactNumber,
      ownerEmail,
      currency,
      bookingAgent,
      bookingSource,
      specialRequirements,
    } = req.body

    const trip = await Trip.findOne({ _id: outboundTrip, company: req.user.company })
    if (!trip) throw new createHttpError.NotFound("Trip not found")

    const bookingRef = `VB-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`

    const booking = new VehicleBooking({
      company: req.user.company,
      bookingReference: bookingRef,
      originPort,
      destinationPort,
      outboundTrip,
      returnTrip: bookingType === "Return" ? returnTrip : null,
      departureDate,
      returnDate: bookingType === "Return" ? returnDate : null,
      bookingType,
      vehicleType,
      visaType,
      vehicleRegistration,
      vehicleModel,
      vehicleColor,
      ownerName,
      ownerContactNumber,
      ownerEmail,
      currency,
      bookingAgent: bookingAgent || null,
      bookingSource,
      specialRequirements,
      createdBy: req.user.id,
      baseFare: req.body.baseFare || 0,
      totalFare: req.body.totalFare || 0,
    })

    await booking.save()

    res.status(201).json({
      message: "Vehicle booking created successfully",
      booking,
    })
  } catch (err) {
    next(err)
  }
}

async function getOne(req, res, next) {
  try {
    const booking = await VehicleBooking.findOne({
      _id: req.params.id,
      company: req.user.company,
      isDeleted: false,
    }).populate("originPort destinationPort outboundTrip returnTrip currency")

    if (!booking) throw new createHttpError.NotFound("Booking not found")

    res.json(booking)
  } catch (err) {
    next(err)
  }
}

async function update(req, res, next) {
  try {
    const booking = await VehicleBooking.findOne({
      _id: req.params.id,
      company: req.user.company,
      isDeleted: false,
    })

    if (!booking) throw new createHttpError.NotFound("Booking not found")

    Object.assign(booking, req.body)
    await booking.save()

    res.json({
      message: "Booking updated successfully",
      booking,
    })
  } catch (err) {
    next(err)
  }
}

async function checkIn(req, res, next) {
  try {
    const booking = await VehicleBooking.findOne({
      _id: req.params.id,
      company: req.user.company,
      isDeleted: false,
    })

    if (!booking) throw new createHttpError.NotFound("Booking not found")

    booking.bookingStatus = "CheckedIn"
    booking.checkInDateTime = new Date()
    await booking.save()

    res.json({ message: "Vehicle checked in", booking })
  } catch (err) {
    next(err)
  }
}

async function remove(req, res, next) {
  try {
    const booking = await VehicleBooking.findOne({
      _id: req.params.id,
      company: req.user.company,
      isDeleted: false,
    })

    if (!booking) throw new createHttpError.NotFound("Booking not found")

    booking.isDeleted = true
    await booking.save()

    res.json({ message: "Booking deleted" })
  } catch (err) {
    next(err)
  }
}

module.exports = { search, create, getOne, update, checkIn, remove }
