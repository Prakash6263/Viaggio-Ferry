const createHttpError = require("http-errors")
const mongoose = require("mongoose")
const { Trip, TRIP_STATUS } = require("../models/Trip")
const { TripAvailability } = require("../models/TripAvailability")
const { TripAgentAllocation } = require("../models/TripAgentAllocation")
const tripService = require("../services/tripService")

/**
 * POST /api/trips
 * Create a new trip with auto-generated availability
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
      bookingOpeningDate,
      bookingClosingDate,
      checkInOpeningDate,
      checkInClosingDate,
      boardingClosingDate,
      status = "SCHEDULED",
      remarks,
      promotion,
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

    if (!ship) {
      throw createHttpError(400, "Missing required field: ship")
    }

    if (!departurePort) {
      throw createHttpError(400, "Missing required field: departurePort")
    }

    if (!arrivalPort) {
      throw createHttpError(400, "Missing required field: arrivalPort")
    }

    if (!departureDateTime) {
      throw createHttpError(400, "Missing required field: departureDateTime")
    }

    if (!arrivalDateTime) {
      throw createHttpError(400, "Missing required field: arrivalDateTime")
    }

    // Validate status
    if (!TRIP_STATUS.includes(status)) {
      throw createHttpError(400, `Status must be one of: ${TRIP_STATUS.join(", ")}`)
    }

    // Validate dates
    const tripData = {
      departureDateTime,
      arrivalDateTime,
      bookingOpeningDate,
      bookingClosingDate,
      boardingClosingDate,
    }
    tripService.validateTripDates(tripData)

    // Validate ship exists and is active
    const shipDoc = await tripService.validateShip(ship, companyId)

    // Validate ports exist
    await tripService.validatePort(departurePort, companyId)
    await tripService.validatePort(arrivalPort, companyId)

    // Check unique tripCode per company
    const existingTrip = await Trip.findOne({
      company: companyId,
      tripCode: tripCode.toUpperCase(),
      isDeleted: false,
    }).lean()

    if (existingTrip) {
      throw createHttpError(409, "Trip code already exists for this company")
    }

    // Create trip
    const trip = new Trip({
      company: companyId,
      tripName: tripName.trim(),
      tripCode: tripCode.toUpperCase(),
      ship,
      departurePort,
      arrivalPort,
      departureDateTime,
      arrivalDateTime,
      bookingOpeningDate,
      bookingClosingDate,
      checkInOpeningDate,
      checkInClosingDate,
      boardingClosingDate,
      status,
      remarks,
      promotion,
      createdBy: tripService.buildActor(user),
    })

    await trip.save()

    // Auto-generate TripAvailability from ship capacities
    const availabilities = await tripService.autoGenerateTripAvailability(trip, shipDoc, companyId)

    res.status(201).json({
      success: true,
      message: "Trip created successfully",
      data: {
        trip: trip.toObject(),
        availabilities: availabilities.map((a) => a.toObject()),
      },
    })
  } catch (error) {
    next(error)
  }
}

/**
 * GET /api/trips
 * List all trips for the company with pagination, search, and filters
 */
const listTrips = async (req, res, next) => {
  try {
    const { companyId } = req
    const {
      page = 1,
      limit = 10,
      search = "",
      departurePort,
      arrivalPort,
      status,
      startDate,
      endDate,
    } = req.query

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

    // Search by trip name or code
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), "i")
      query.$or = [{ tripName: searchRegex }, { tripCode: searchRegex }]
    }

    // Filter by departure port
    if (departurePort && mongoose.Types.ObjectId.isValid(departurePort)) {
      query.departurePort = departurePort
    }

    // Filter by arrival port
    if (arrivalPort && mongoose.Types.ObjectId.isValid(arrivalPort)) {
      query.arrivalPort = arrivalPort
    }

    // Filter by status
    if (status && TRIP_STATUS.includes(status)) {
      query.status = status
    }

    // Date range filter
    if (startDate || endDate) {
      query.departureDateTime = {}
      if (startDate) {
        query.departureDateTime.$gte = new Date(startDate)
      }
      if (endDate) {
        query.departureDateTime.$lte = new Date(endDate)
      }
    }

    // Fetch trips and total count
    const [trips, total] = await Promise.all([
      Trip.find(query)
        .populate("ship", "name")
        .populate("departurePort", "name code")
        .populate("arrivalPort", "name code")
        .sort({ departureDateTime: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Trip.countDocuments(query),
    ])

    const totalPages = Math.ceil(total / limitNum)

    res.status(200).json({
      success: true,
      message: "Trips retrieved successfully",
      data: trips,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages,
      },
    })
  } catch (error) {
    next(error)
  }
}

/**
 * GET /api/trips/:id
 * Get a specific trip by ID with availability details
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
      .populate("ship", "name")
      .populate("departurePort", "name code")
      .populate("arrivalPort", "name code")
      .lean()

    if (!trip) {
      throw createHttpError(404, "Trip not found")
    }

    // Fetch availability for this trip
    const availabilities = await TripAvailability.find({
      trip: id,
      isDeleted: false,
    })
      .populate("cabinId", "name type")
      .lean()

    res.status(200).json({
      success: true,
      message: "Trip retrieved successfully",
      data: {
        trip,
        availabilities,
      },
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
    const updates = req.body

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw createHttpError(400, "Invalid trip ID format")
    }

    // Fetch the trip
    const trip = await Trip.findOne({
      _id: id,
      company: companyId,
      isDeleted: false,
    })

    if (!trip) {
      throw createHttpError(404, "Trip not found")
    }

    // Validate edit constraints
    await tripService.validateTripEdit(trip, updates)

    // Validate dates if being updated
    if (
      updates.departureDateTime ||
      updates.arrivalDateTime ||
      updates.bookingOpeningDate ||
      updates.bookingClosingDate ||
      updates.boardingClosingDate
    ) {
      const tripData = {
        departureDateTime: updates.departureDateTime || trip.departureDateTime,
        arrivalDateTime: updates.arrivalDateTime || trip.arrivalDateTime,
        bookingOpeningDate: updates.bookingOpeningDate || trip.bookingOpeningDate,
        bookingClosingDate: updates.bookingClosingDate || trip.bookingClosingDate,
        boardingClosingDate: updates.boardingClosingDate || trip.boardingClosingDate,
      }
      tripService.validateTripDates(tripData)
    }

    // Validate ship if being changed
    if (updates.ship && updates.ship.toString() !== trip.ship.toString()) {
      await tripService.validateShip(updates.ship, companyId)
    }

    // Validate ports if being changed
    if (updates.departurePort) {
      await tripService.validatePort(updates.departurePort, companyId)
    }

    if (updates.arrivalPort) {
      await tripService.validatePort(updates.arrivalPort, companyId)
    }

    // Validate status
    if (updates.status && !TRIP_STATUS.includes(updates.status)) {
      throw createHttpError(400, `Status must be one of: ${TRIP_STATUS.join(", ")}`)
    }

    // Update fields
    Object.assign(trip, updates)
    trip.updatedBy = tripService.buildActor(user)

    await trip.save()

    res.status(200).json({
      success: true,
      message: "Trip updated successfully",
      data: trip.toObject(),
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

    const trip = await Trip.findOne({
      _id: id,
      company: companyId,
      isDeleted: false,
    })

    if (!trip) {
      throw createHttpError(404, "Trip not found")
    }

    // Validate can delete
    await tripService.validateCanDeleteTrip(trip._id)

    // Soft delete
    trip.isDeleted = true
    trip.updatedBy = tripService.buildActor(user)
    await trip.save()

    // Also soft delete associated availabilities
    await TripAvailability.updateMany(
      { trip: trip._id, isDeleted: false },
      { isDeleted: true }
    )

    res.status(200).json({
      success: true,
      message: "Trip deleted successfully",
      data: { _id: trip._id, deletedAt: new Date() },
    })
  } catch (error) {
    next(error)
  }
}

/**
 * GET /api/trips/:tripId/availability
 * Get availability details for a trip
 */
const getTripAvailability = async (req, res, next) => {
  try {
    const { tripId } = req.params
    const { companyId } = req

    if (!mongoose.Types.ObjectId.isValid(tripId)) {
      throw createHttpError(400, "Invalid trip ID format")
    }

    // Verify trip exists
    const trip = await Trip.findOne({
      _id: tripId,
      company: companyId,
      isDeleted: false,
    }).lean()

    if (!trip) {
      throw createHttpError(404, "Trip not found")
    }

    // Fetch availability with cabin details
    const availabilities = await TripAvailability.find({
      trip: tripId,
      isDeleted: false,
    })
      .populate("cabinId", "name type")
      .sort({ availabilityType: 1 })
      .lean()

    // Enrich with remaining capacity calculation
    const enriched = await Promise.all(
      availabilities.map(async (avail) => ({
        ...avail,
        remainingCapacity: await tripService.calculateRemainingCapacity(avail),
      }))
    )

    res.status(200).json({
      success: true,
      message: "Trip availability retrieved successfully",
      data: enriched,
    })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  createTrip,
  listTrips,
  getTripById,
  updateTrip,
  deleteTrip,
  getTripAvailability,
}
