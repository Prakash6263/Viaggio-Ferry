const createHttpError = require("http-errors")
const mongoose = require("mongoose")
const { Trip, TRIP_STATUS } = require("../models/Trip")
const { Ship } = require("../models/Ship")
const { Port } = require("../models/Port")
const { Promotion } = require("../models/Promotion")

/**
 * Helper function to build actor object based on user role
 */
function buildActor(user) {
  if (!user) {
    return { type: "system", name: "System" }
  }

  if (user.role === "company") {
    return {
      id: user.id,
      name: user.email,
      type: "company",
    }
  }

  return {
    id: user.id,
    name: user.email,
    type: "user",
    layer: user.layer,
  }
}

/**
 * Validate date order
 */
function validateTripDates(departureDateTime, arrivalDateTime, bookingOpeningDate, bookingClosingDate, checkInOpeningDate, checkInClosingDate, boardingClosingDate) {
  // Departure must be before arrival
  if (new Date(departureDateTime) >= new Date(arrivalDateTime)) {
    throw createHttpError(400, "Departure date/time must be before arrival date/time")
  }

  // If booking dates are provided, validate them
  if (bookingOpeningDate && bookingClosingDate) {
    if (new Date(bookingOpeningDate) >= new Date(bookingClosingDate)) {
      throw createHttpError(400, "Booking opening date must be before booking closing date")
    }
    // Booking closing should be before or on departure
    if (new Date(bookingClosingDate) > new Date(departureDateTime)) {
      throw createHttpError(400, "Booking closing date must be on or before departure date/time")
    }
  }

  // If check-in dates are provided, validate them
  if (checkInOpeningDate && checkInClosingDate) {
    if (new Date(checkInOpeningDate) >= new Date(checkInClosingDate)) {
      throw createHttpError(400, "Check-in opening date must be before check-in closing date")
    }
  }

  // If boarding closing date is provided, validate it
  if (boardingClosingDate) {
    if (new Date(boardingClosingDate) > new Date(departureDateTime)) {
      throw createHttpError(400, "Boarding closing date must be on or before departure date/time")
    }
  }
}

/**
 * GET /api/trips
 * List all trips for the company with pagination and search
 */
const listTrips = async (req, res, next) => {
  try {
    const { companyId } = req
    const { page = 1, limit = 10, search = "", status = "", ship = "", departurePort = "", arrivalPort = "" } = req.query

    if (!companyId) {
      throw createHttpError(400, "Company ID is required")
    }

    // Parse pagination
    const pageNum = Math.max(1, parseInt(page) || 1)
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10))
    const skip = (pageNum - 1) * limitNum

    // Build query
    const query = {
      company: companyId,
      isDeleted: false,
    }

    // Add filters
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), "i")
      query.$or = [
        { tripName: searchRegex },
        { tripCode: searchRegex },
        { remarks: searchRegex },
      ]
    }

    if (status && status.trim()) {
      if (!TRIP_STATUS.includes(status.toUpperCase())) {
        throw createHttpError(400, `Invalid status. Must be one of: ${TRIP_STATUS.join(", ")}`)
      }
      query.status = status.toUpperCase()
    }

    if (ship && ship.trim()) {
      if (!mongoose.Types.ObjectId.isValid(ship)) {
        throw createHttpError(400, "Invalid ship ID format")
      }
      query.ship = ship
    }

    if (departurePort && departurePort.trim()) {
      if (!mongoose.Types.ObjectId.isValid(departurePort)) {
        throw createHttpError(400, "Invalid departure port ID format")
      }
      query.departurePort = departurePort
    }

    if (arrivalPort && arrivalPort.trim()) {
      if (!mongoose.Types.ObjectId.isValid(arrivalPort)) {
        throw createHttpError(400, "Invalid arrival port ID format")
      }
      query.arrivalPort = arrivalPort
    }

    // Fetch trips and total count
    const [trips, total] = await Promise.all([
      Trip.find(query)
        .populate("ship")
        .populate("departurePort", "name code")
        .populate("arrivalPort", "name code")
        .populate("promotion", "name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Trip.countDocuments(query),
    ])

    const totalPages = Math.ceil(total / limitNum)

    res.status(200).json({
      success: true,
      message: "Trips retrieved successfully",
      data: {
        trips,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages,
        },
      },
    })
  } catch (error) {
    next(error)
  }
}

/**
 * GET /api/trips/:id
 * Get a specific trip by ID
 */
const getTripById = async (req, res, next) => {
  try {
    const { id } = req.params
    const { companyId } = req

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw createHttpError(400, "Invalid trip ID format")
    }

    const trip = await Trip.findOne({
      _id: id,
      company: companyId,
      isDeleted: false,
    })
      .populate("ship")
      .populate("departurePort", "name code country")
      .populate("arrivalPort", "name code country")
      .populate("promotion", "name discountType discountValue")

    if (!trip) {
      throw createHttpError(404, "Trip not found")
    }

    res.status(200).json({
      success: true,
      message: "Trip retrieved successfully",
      data: trip,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * POST /api/trips
 * Create a new trip
 */
const createTrip = async (req, res, next) => {
  try {
    const { companyId, user } = req
    const {
      tripName,
      tripCode,
      ship,
      departurePort,
      arrivalPort,
      departureDateTime,
      arrivalDateTime,
      status = "SCHEDULED",
      bookingOpeningDate,
      bookingClosingDate,
      checkInOpeningDate,
      checkInClosingDate,
      boardingClosingDate,
      promotion,
      remarks,
      remainingPassengerSeats = 0,
      remainingCargoSeats = 0,
      remainingVehicleSeats = 0,
    } = req.body

    if (!companyId) {
      throw createHttpError(400, "Company ID is required")
    }

    // Validate required fields
    if (!tripName || !tripName.trim()) {
      throw createHttpError(400, "Missing required field: tripName")
    }

    if (!tripCode || !tripCode.trim()) {
      throw createHttpError(400, "Missing required field: tripCode")
    }

    if (!ship || !ship.trim()) {
      throw createHttpError(400, "Missing required field: ship")
    }

    if (!departurePort || !departurePort.trim()) {
      throw createHttpError(400, "Missing required field: departurePort")
    }

    if (!arrivalPort || !arrivalPort.trim()) {
      throw createHttpError(400, "Missing required field: arrivalPort")
    }

    if (!departureDateTime) {
      throw createHttpError(400, "Missing required field: departureDateTime")
    }

    if (!arrivalDateTime) {
      throw createHttpError(400, "Missing required field: arrivalDateTime")
    }

    // Validate status
    if (!TRIP_STATUS.includes(status.toUpperCase())) {
      throw createHttpError(400, `Invalid status. Must be one of: ${TRIP_STATUS.join(", ")}`)
    }

    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(ship)) {
      throw createHttpError(400, "Invalid ship ID format")
    }

    if (!mongoose.Types.ObjectId.isValid(departurePort)) {
      throw createHttpError(400, "Invalid departure port ID format")
    }

    if (!mongoose.Types.ObjectId.isValid(arrivalPort)) {
      throw createHttpError(400, "Invalid arrival port ID format")
    }

    if (promotion && !mongoose.Types.ObjectId.isValid(promotion)) {
      throw createHttpError(400, "Invalid promotion ID format")
    }

    // Validate dates
    validateTripDates(departureDateTime, arrivalDateTime, bookingOpeningDate, bookingClosingDate, checkInOpeningDate, checkInClosingDate, boardingClosingDate)

    // Verify ship exists and belongs to company
    const shipDoc = await Ship.findOne({
      _id: ship,
      company: companyId,
      isDeleted: false,
    }).lean()

    if (!shipDoc) {
      throw createHttpError(404, "Ship not found")
    }

    // Verify departure port exists
    const depPort = await Port.findOne({
      _id: departurePort,
      isDeleted: false,
    }).lean()

    if (!depPort) {
      throw createHttpError(404, "Departure port not found")
    }

    // Verify arrival port exists
    const arrPort = await Port.findOne({
      _id: arrivalPort,
      isDeleted: false,
    }).lean()

    if (!arrPort) {
      throw createHttpError(404, "Arrival port not found")
    }

    // Verify promotion exists if provided
    if (promotion) {
      const promo = await Promotion.findOne({
        _id: promotion,
        company: companyId,
        isDeleted: false,
      }).lean()

      if (!promo) {
        throw createHttpError(404, "Promotion not found")
      }
    }

    // Check for duplicate trip code within company
    const existingTrip = await Trip.findOne({
      company: companyId,
      tripCode: tripCode.toUpperCase(),
      isDeleted: false,
    }).lean()

    if (existingTrip) {
      throw createHttpError(400, "Trip code already exists for this company")
    }

    // Calculate remaining seats from ship capacity
    const shipCapacity = {
      passenger: shipDoc.passengerCapacity.reduce((sum, cap) => sum + (cap.seats || 0), 0),
      cargo: shipDoc.cargoCapacity.reduce((sum, cap) => sum + (cap.spots || 0), 0),
      vehicle: shipDoc.vehicleCapacity.reduce((sum, cap) => sum + (cap.spots || 0), 0),
    }

    // Build createdBy object
    const createdBy = buildActor(user)

    // Create trip
    const tripData = {
      company: companyId,
      tripName: tripName.trim(),
      tripCode: tripCode.toUpperCase().trim(),
      ship,
      departurePort,
      arrivalPort,
      departureDateTime: new Date(departureDateTime),
      arrivalDateTime: new Date(arrivalDateTime),
      status: status.toUpperCase(),
      // Auto-calculate remaining seats from ship capacity
      remainingPassengerSeats: shipCapacity.passenger,
      remainingCargoSeats: shipCapacity.cargo,
      remainingVehicleSeats: shipCapacity.vehicle,
      createdBy,
    }

    // Add optional fields
    if (bookingOpeningDate) tripData.bookingOpeningDate = new Date(bookingOpeningDate)
    if (bookingClosingDate) tripData.bookingClosingDate = new Date(bookingClosingDate)
    if (checkInOpeningDate) tripData.checkInOpeningDate = new Date(checkInOpeningDate)
    if (checkInClosingDate) tripData.checkInClosingDate = new Date(checkInClosingDate)
    if (boardingClosingDate) tripData.boardingClosingDate = new Date(boardingClosingDate)
    if (promotion) tripData.promotion = promotion
    if (remarks) tripData.remarks = remarks.trim()
    
    // Add remaining seats
    tripData.remainingPassengerSeats = Math.max(0, parseInt(remainingPassengerSeats) || 0)
    tripData.remainingCargoSeats = Math.max(0, parseInt(remainingCargoSeats) || 0)
    tripData.remainingVehicleSeats = Math.max(0, parseInt(remainingVehicleSeats) || 0)

    const newTrip = new Trip(tripData)
    await newTrip.save()

    // Populate references before returning
    const populatedTrip = await Trip.findById(newTrip._id)
      .populate("ship", "name imoNumber")
      .populate("departurePort", "name code")
      .populate("arrivalPort", "name code")
      .populate("promotion", "name")

    res.status(201).json({
      success: true,
      message: "Trip created successfully",
      data: populatedTrip,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * PUT /api/trips/:id
 * Update an existing trip
 */
const updateTrip = async (req, res, next) => {
  try {
    const { id } = req.params
    const { companyId, user } = req
    const {
      tripName,
      tripCode,
      ship,
      departurePort,
      arrivalPort,
      departureDateTime,
      arrivalDateTime,
      status,
      bookingOpeningDate,
      bookingClosingDate,
      checkInOpeningDate,
      checkInClosingDate,
      boardingClosingDate,
      promotion,
      remarks,
      remainingPassengerSeats,
      remainingCargoSeats,
      remainingVehicleSeats,
    } = req.body

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw createHttpError(400, "Invalid trip ID format")
    }

    // Fetch the trip
    const tripDoc = await Trip.findOne({
      _id: id,
      company: companyId,
      isDeleted: false,
    })

    if (!tripDoc) {
      throw createHttpError(404, "Trip not found")
    }

    // Validate and update fields
    if (tripName !== undefined) {
      if (!tripName || !tripName.trim()) {
        throw createHttpError(400, "tripName cannot be empty")
      }
      tripDoc.tripName = tripName.trim()
    }

    if (tripCode !== undefined) {
      if (!tripCode || !tripCode.trim()) {
        throw createHttpError(400, "tripCode cannot be empty")
      }
      // Check for duplicate trip code (excluding current trip)
      const existingTrip = await Trip.findOne({
        company: companyId,
        tripCode: tripCode.toUpperCase(),
        _id: { $ne: id },
        isDeleted: false,
      }).lean()

      if (existingTrip) {
        throw createHttpError(400, "Trip code already exists for this company")
      }
      tripDoc.tripCode = tripCode.toUpperCase().trim()
    }

    if (ship !== undefined) {
      if (!ship || !ship.trim()) {
        throw createHttpError(400, "ship cannot be empty")
      }
      if (!mongoose.Types.ObjectId.isValid(ship)) {
        throw createHttpError(400, "Invalid ship ID format")
      }

      const shipDoc = await Ship.findOne({
        _id: ship,
        company: companyId,
        isDeleted: false,
      }).lean()

      if (!shipDoc) {
        throw createHttpError(404, "Ship not found")
      }
      tripDoc.ship = ship
    }

    if (departurePort !== undefined) {
      if (!departurePort || !departurePort.trim()) {
        throw createHttpError(400, "departurePort cannot be empty")
      }
      if (!mongoose.Types.ObjectId.isValid(departurePort)) {
        throw createHttpError(400, "Invalid departure port ID format")
      }

      const depPort = await Port.findOne({
        _id: departurePort,
        isDeleted: false,
      }).lean()

      if (!depPort) {
        throw createHttpError(404, "Departure port not found")
      }
      tripDoc.departurePort = departurePort
    }

    if (arrivalPort !== undefined) {
      if (!arrivalPort || !arrivalPort.trim()) {
        throw createHttpError(400, "arrivalPort cannot be empty")
      }
      if (!mongoose.Types.ObjectId.isValid(arrivalPort)) {
        throw createHttpError(400, "Invalid arrival port ID format")
      }

      const arrPort = await Port.findOne({
        _id: arrivalPort,
        isDeleted: false,
      }).lean()

      if (!arrPort) {
        throw createHttpError(404, "Arrival port not found")
      }
      tripDoc.arrivalPort = arrivalPort
    }

    if (departureDateTime !== undefined) {
      if (!departureDateTime) {
        throw createHttpError(400, "departureDateTime cannot be empty")
      }
      tripDoc.departureDateTime = new Date(departureDateTime)
    }

    if (arrivalDateTime !== undefined) {
      if (!arrivalDateTime) {
        throw createHttpError(400, "arrivalDateTime cannot be empty")
      }
      tripDoc.arrivalDateTime = new Date(arrivalDateTime)
    }

    if (status !== undefined) {
      if (!TRIP_STATUS.includes(status.toUpperCase())) {
        throw createHttpError(400, `Invalid status. Must be one of: ${TRIP_STATUS.join(", ")}`)
      }
      tripDoc.status = status.toUpperCase()
    }

    // Update optional fields
    if (bookingOpeningDate !== undefined) {
      tripDoc.bookingOpeningDate = bookingOpeningDate ? new Date(bookingOpeningDate) : null
    }

    if (bookingClosingDate !== undefined) {
      tripDoc.bookingClosingDate = bookingClosingDate ? new Date(bookingClosingDate) : null
    }

    if (checkInOpeningDate !== undefined) {
      tripDoc.checkInOpeningDate = checkInOpeningDate ? new Date(checkInOpeningDate) : null
    }

    if (checkInClosingDate !== undefined) {
      tripDoc.checkInClosingDate = checkInClosingDate ? new Date(checkInClosingDate) : null
    }

    if (boardingClosingDate !== undefined) {
      tripDoc.boardingClosingDate = boardingClosingDate ? new Date(boardingClosingDate) : null
    }

    if (promotion !== undefined) {
      if (promotion && !mongoose.Types.ObjectId.isValid(promotion)) {
        throw createHttpError(400, "Invalid promotion ID format")
      }

      if (promotion) {
        const promo = await Promotion.findOne({
          _id: promotion,
          company: companyId,
          isDeleted: false,
        }).lean()

        if (!promo) {
          throw createHttpError(404, "Promotion not found")
        }
        tripDoc.promotion = promotion
      } else {
        tripDoc.promotion = null
      }
    }

    if (remarks !== undefined) {
      tripDoc.remarks = remarks ? remarks.trim() : null
    }

    // Update remaining seats if provided
    if (remainingPassengerSeats !== undefined) {
      tripDoc.remainingPassengerSeats = Math.max(0, parseInt(remainingPassengerSeats) || 0)
    }

    if (remainingCargoSeats !== undefined) {
      tripDoc.remainingCargoSeats = Math.max(0, parseInt(remainingCargoSeats) || 0)
    }

    if (remainingVehicleSeats !== undefined) {
      tripDoc.remainingVehicleSeats = Math.max(0, parseInt(remainingVehicleSeats) || 0)
    }

    // Validate dates
    validateTripDates(
      tripDoc.departureDateTime,
      tripDoc.arrivalDateTime,
      tripDoc.bookingOpeningDate,
      tripDoc.bookingClosingDate,
      tripDoc.checkInOpeningDate,
      tripDoc.checkInClosingDate,
      tripDoc.boardingClosingDate
    )

    // Build updatedBy object
    const updatedBy = buildActor(user)
    tripDoc.updatedBy = updatedBy

    await tripDoc.save()

    // Populate references before returning
    const populatedTrip = await Trip.findById(tripDoc._id)
      .populate("ship", "name imoNumber")
      .populate("departurePort", "name code")
      .populate("arrivalPort", "name code")
      .populate("promotion", "name")

    res.status(200).json({
      success: true,
      message: "Trip updated successfully",
      data: populatedTrip,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * DELETE /api/trips/:id
 * Soft delete a trip
 */
const deleteTrip = async (req, res, next) => {
  try {
    const { id } = req.params
    const { companyId, user } = req

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw createHttpError(400, "Invalid trip ID format")
    }

    const tripDoc = await Trip.findOne({
      _id: id,
      company: companyId,
      isDeleted: false,
    })

    if (!tripDoc) {
      throw createHttpError(404, "Trip not found")
    }

    // Soft delete
    tripDoc.isDeleted = true
    const updatedBy = buildActor(user)
    tripDoc.updatedBy = updatedBy
    await tripDoc.save()

    res.status(200).json({
      success: true,
      message: "Trip deleted successfully",
      data: { _id: tripDoc._id, deletedAt: new Date() },
    })
  } catch (error) {
    next(error)
  }
}

/**
 * GET /api/trips/:id/availability
 * Get trip availability (remaining seats for cargo, vehicle, passenger)
 */
const getTripAvailability = async (req, res, next) => {
  try {
    const { id } = req.params
    const { companyId } = req

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw createHttpError(400, "Invalid trip ID format")
    }

    const trip = await Trip.findOne({
      _id: id,
      company: companyId,
      isDeleted: false,
    })
      .populate({
        path: "ship",
        select: "name passengerCapacity cargoCapacity vehicleCapacity",
      })

    if (!trip) {
      throw createHttpError(404, "Trip not found")
    }

    // Calculate total capacity from ship
    const ship = trip.ship
    let totalPassengerSeats = 0
    let totalCargoSpots = 0
    let totalVehicleSpots = 0

    if (ship.passengerCapacity && Array.isArray(ship.passengerCapacity)) {
      totalPassengerSeats = ship.passengerCapacity.reduce((sum, cabin) => sum + (cabin.seats || 0), 0)
    }

    if (ship.cargoCapacity && Array.isArray(ship.cargoCapacity)) {
      totalCargoSpots = ship.cargoCapacity.reduce((sum, cabin) => sum + (cabin.spots || 0), 0)
    }

    if (ship.vehicleCapacity && Array.isArray(ship.vehicleCapacity)) {
      totalVehicleSpots = ship.vehicleCapacity.reduce((sum, cabin) => sum + (cabin.spots || 0), 0)
    }

    // TODO: Get booked counts from Booking collection
    // For now, returning total capacity as placeholder
    res.status(200).json({
      success: true,
      message: "Trip availability retrieved successfully",
      data: {
        tripId: trip._id,
        tripName: trip.tripName,
        tripCode: trip.tripCode,
        capacity: {
          passengerSeats: {
            total: totalPassengerSeats,
            booked: 0, // TODO: Calculate from bookings
            remaining: totalPassengerSeats,
          },
          cargoSpots: {
            total: totalCargoSpots,
            booked: 0, // TODO: Calculate from bookings
            remaining: totalCargoSpots,
          },
          vehicleSpots: {
            total: totalVehicleSpots,
            booked: 0, // TODO: Calculate from bookings
            remaining: totalVehicleSpots,
          },
        },
      },
    })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  listTrips,
  getTripById,
  createTrip,
  updateTrip,
  deleteTrip,
  getTripAvailability,
}
