const createHttpError = require("http-errors")
const mongoose = require("mongoose")
const { TripAvailability, AVAILABILITY_TYPE } = require("../models/TripAvailability")
const { Trip } = require("../models/Trip")
const { Cabin } = require("../models/Cabin")

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
 * List Trip Availabilities
 */
const listTripAvailabilities = async (req, res, next) => {
  try {
    const { companyId } = req
    const { tripId } = req.params
    const { type, page = 1, limit = 10, search = "" } = req.query

    // Validate trip exists and belongs to company
    const trip = await Trip.findOne({
      _id: tripId,
      company: companyId,
      isDeleted: false,
    })

    if (!trip) {
      throw createHttpError(404, "Trip not found")
    }

    // Build query
    const query = {
      company: companyId,
      trip: tripId,
      isDeleted: false,
    }

    if (type) {
      if (!AVAILABILITY_TYPE.includes(type)) {
        throw createHttpError(400, `Invalid type. Must be one of: ${AVAILABILITY_TYPE.join(", ")}`)
      }
      query.type = type
    }

    if (search) {
      // Search in cabin name via cabin document
      const cabins = await Cabin.find(
        {
          company: companyId,
          name: { $regex: search, $options: "i" },
          isDeleted: false,
        },
        { _id: 1 }
      ).lean()

      const cabinIds = cabins.map(c => c._id)
      if (cabinIds.length === 0) {
        // No matching cabins, return empty results
        return res.json({
          success: true,
          data: [],
          pagination: { page: parseInt(page), limit: parseInt(limit), total: 0 },
        })
      }
      query["cabins.cabin"] = { $in: cabinIds }
    }

    const pageNum = Math.max(1, parseInt(page))
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)))
    const skip = (pageNum - 1) * limitNum

    const [availabilities, total] = await Promise.all([
      TripAvailability.find(query)
        .populate("cabins.cabin", "name type")
        .populate("allocatedAgent", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      TripAvailability.countDocuments(query),
    ])

    res.json({
      success: true,
      data: availabilities,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Get Trip Availability by ID
 */
const getTripAvailabilityById = async (req, res, next) => {
  try {
    const { companyId } = req
    const { tripId, availabilityId } = req.params

    // Validate trip exists
    const trip = await Trip.findOne({
      _id: tripId,
      company: companyId,
      isDeleted: false,
    })

    if (!trip) {
      throw createHttpError(404, "Trip not found")
    }

    const availability = await TripAvailability.findOne({
      _id: availabilityId,
      company: companyId,
      trip: tripId,
      isDeleted: false,
    })
      .populate("cabins.cabin", "name type")
      .populate("allocatedAgent", "name email")

    if (!availability) {
      throw createHttpError(404, "Availability not found")
    }

    res.json({
      success: true,
      data: availability,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Create Trip Availability with multiple cabins
 * Validates total seats don't exceed remaining seats and decreases trip's remaining seats
 */
const createTripAvailability = async (req, res, next) => {
  try {
    const { companyId, user } = req
    const { tripId } = req.params
    const { type, cabins, remarks } = req.body

    // Validate required fields
    if (!type || !cabins || !Array.isArray(cabins) || cabins.length === 0) {
      throw createHttpError(
        400,
        "Missing required fields: type, cabins (array). Cabins array must contain at least one entry."
      )
    }

    // Validate type
    if (!AVAILABILITY_TYPE.includes(type)) {
      throw createHttpError(400, `Invalid type. Must be one of: ${AVAILABILITY_TYPE.join(", ")}`)
    }

    // Get trip and validate it exists and belongs to company
    const trip = await Trip.findOne({
      _id: tripId,
      company: companyId,
      isDeleted: false,
    })

    if (!trip) {
      throw createHttpError(404, "Trip not found")
    }

    // Get the remaining seats for this type
    let remainingSeats = 0
    if (type === "passenger") {
      remainingSeats = trip.remainingPassengerSeats
    } else if (type === "cargo") {
      remainingSeats = trip.remainingCargoSeats
    } else if (type === "vehicle") {
      remainingSeats = trip.remainingVehicleSeats
    }

    // Validate and process each cabin
    const processedCabins = []
    let totalSeats = 0

    for (const cabinEntry of cabins) {
      const { cabin, seats } = cabinEntry

      // Validate cabin exists and belongs to company and matches type
      const cabinDoc = await Cabin.findOne({
        _id: cabin,
        company: companyId,
        type: type,
        isDeleted: false,
      })

      if (!cabinDoc) {
        throw createHttpError(404, `Cabin not found or type mismatch for type: ${type}`)
      }

      // Validate seats
      const seatsNum = parseInt(seats)
      if (isNaN(seatsNum) || seatsNum < 1) {
        throw createHttpError(400, `Seats must be a positive number for cabin ${cabinDoc.name}`)
      }

      totalSeats += seatsNum
      processedCabins.push({
        cabin,
        seats: seatsNum,
        allocatedSeats: 0,
      })
    }

    // Validate that total requested seats don't exceed remaining seats
    if (totalSeats > remainingSeats) {
      throw createHttpError(
        400,
        `Cannot allocate ${totalSeats} ${type} seats. Only ${remainingSeats} remaining seats available for ${type}.`
      )
    }

    // Create availability record
    const availabilityData = {
      company: companyId,
      trip: tripId,
      type,
      cabins: processedCabins,
      createdBy: buildActor(user),
    }

    if (remarks) {
      availabilityData.remarks = remarks.trim()
    }

    const availability = new TripAvailability(availabilityData)
    await availability.save()

    // Decrease remaining seats in trip
    const updateData = {}
    if (type === "passenger") {
      updateData.remainingPassengerSeats = Math.max(0, trip.remainingPassengerSeats - totalSeats)
    } else if (type === "cargo") {
      updateData.remainingCargoSeats = Math.max(0, trip.remainingCargoSeats - totalSeats)
    } else if (type === "vehicle") {
      updateData.remainingVehicleSeats = Math.max(0, trip.remainingVehicleSeats - totalSeats)
    }

    updateData.updatedBy = buildActor(user)
    await Trip.findByIdAndUpdate(tripId, updateData)

    // Populate before responding
    const savedAvailability = await TripAvailability.findById(availability._id)
      .populate("cabins.cabin", "name type")
      .populate("allocatedAgent", "name email")

    res.status(201).json({
      success: true,
      message: "Availability created successfully",
      data: savedAvailability,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Update Trip Availability
 * Handles cabin and seat updates while maintaining remaining seats constraint
 */
const updateTripAvailability = async (req, res, next) => {
  try {
    const { companyId, user } = req
    const { tripId, availabilityId } = req.params
    const { cabins, allocatedAgent, remarks } = req.body

    // Validate trip exists
    const trip = await Trip.findOne({
      _id: tripId,
      company: companyId,
      isDeleted: false,
    })

    if (!trip) {
      throw createHttpError(404, "Trip not found")
    }

    // Get availability record
    const availability = await TripAvailability.findOne({
      _id: availabilityId,
      company: companyId,
      trip: tripId,
      isDeleted: false,
    })

    if (!availability) {
      throw createHttpError(404, "Availability not found")
    }

    // Calculate old total seats
    const oldTotalSeats = availability.cabins.reduce((sum, c) => sum + c.seats, 0)

    // Handle cabins update
    if (cabins !== undefined && Array.isArray(cabins) && cabins.length > 0) {
      // Validate and process new cabins
      const processedCabins = []
      let newTotalSeats = 0

      for (const cabinEntry of cabins) {
        const { cabin, seats } = cabinEntry

        // Validate cabin exists and belongs to company and matches type
        const cabinDoc = await Cabin.findOne({
          _id: cabin,
          company: companyId,
          type: availability.type,
          isDeleted: false,
        })

        if (!cabinDoc) {
          throw createHttpError(404, `Cabin not found or type mismatch for type: ${availability.type}`)
        }

        // Validate seats
        const seatsNum = parseInt(seats)
        if (isNaN(seatsNum) || seatsNum < 1) {
          throw createHttpError(400, `Seats must be a positive number for cabin ${cabinDoc.name}`)
        }

        newTotalSeats += seatsNum
        processedCabins.push({
          cabin,
          seats: seatsNum,
          allocatedSeats: cabinEntry.allocatedSeats || 0,
        })
      }

      // Handle seat differences
      if (newTotalSeats > oldTotalSeats) {
        const difference = newTotalSeats - oldTotalSeats
        let remainingSeats = 0

        if (availability.type === "passenger") {
          remainingSeats = trip.remainingPassengerSeats
        } else if (availability.type === "cargo") {
          remainingSeats = trip.remainingCargoSeats
        } else if (availability.type === "vehicle") {
          remainingSeats = trip.remainingVehicleSeats
        }

        if (difference > remainingSeats) {
          throw createHttpError(
            400,
            `Cannot increase seats by ${difference}. Only ${remainingSeats} remaining seats available.`
          )
        }

        // Decrease trip's remaining seats
        const updateData = {}
        if (availability.type === "passenger") {
          updateData.remainingPassengerSeats = Math.max(0, trip.remainingPassengerSeats - difference)
        } else if (availability.type === "cargo") {
          updateData.remainingCargoSeats = Math.max(0, trip.remainingCargoSeats - difference)
        } else if (availability.type === "vehicle") {
          updateData.remainingVehicleSeats = Math.max(0, trip.remainingVehicleSeats - difference)
        }

        updateData.updatedBy = buildActor(user)
        await Trip.findByIdAndUpdate(tripId, updateData)
      } else if (newTotalSeats < oldTotalSeats) {
        // If seats are being decreased, restore remaining seats in trip
        const difference = oldTotalSeats - newTotalSeats
        const updateData = {}

        if (availability.type === "passenger") {
          updateData.remainingPassengerSeats = trip.remainingPassengerSeats + difference
        } else if (availability.type === "cargo") {
          updateData.remainingCargoSeats = trip.remainingCargoSeats + difference
        } else if (availability.type === "vehicle") {
          updateData.remainingVehicleSeats = trip.remainingVehicleSeats + difference
        }

        updateData.updatedBy = buildActor(user)
        await Trip.findByIdAndUpdate(tripId, updateData)
      }

      availability.cabins = processedCabins
    }

    // Handle agent allocation
    if (allocatedAgent !== undefined) {
      if (allocatedAgent === null) {
        availability.allocatedAgent = null
      } else {
        availability.allocatedAgent = allocatedAgent
      }
    }

    // Handle remarks
    if (remarks !== undefined) {
      availability.remarks = remarks ? remarks.trim() : null
    }

    availability.updatedBy = buildActor(user)
    await availability.save()

    // Populate and respond
    const updatedAvailability = await TripAvailability.findById(availabilityId)
      .populate("cabins.cabin", "name type")
      .populate("allocatedAgent", "name email")

    res.json({
      success: true,
      message: "Availability updated successfully",
      data: updatedAvailability,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Delete Trip Availability (soft delete)
 * Restores remaining seats in trip when availability is deleted
 */
const deleteTripAvailability = async (req, res, next) => {
  try {
    const { companyId, user } = req
    const { tripId, availabilityId } = req.params

    // Validate trip exists
    const trip = await Trip.findOne({
      _id: tripId,
      company: companyId,
      isDeleted: false,
    })

    if (!trip) {
      throw createHttpError(404, "Trip not found")
    }

    // Get availability record
    const availability = await TripAvailability.findOne({
      _id: availabilityId,
      company: companyId,
      trip: tripId,
      isDeleted: false,
    })

    if (!availability) {
      throw createHttpError(404, "Availability not found")
    }

    // Calculate total seats to restore
    const totalSeats = availability.cabins.reduce((sum, c) => sum + c.seats, 0)

    // Soft delete and restore seats
    availability.isDeleted = true
    availability.updatedBy = buildActor(user)
    await availability.save()

    // Restore remaining seats in trip
    const updateData = {}
    if (availability.type === "passenger") {
      updateData.remainingPassengerSeats = trip.remainingPassengerSeats + totalSeats
    } else if (availability.type === "cargo") {
      updateData.remainingCargoSeats = trip.remainingCargoSeats + totalSeats
    } else if (availability.type === "vehicle") {
      updateData.remainingVehicleSeats = trip.remainingVehicleSeats + totalSeats
    }

    updateData.updatedBy = buildActor(user)
    await Trip.findByIdAndUpdate(tripId, updateData)

    res.json({
      success: true,
      message: "Availability deleted successfully",
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Get available seats for a trip
 */
const getTripAvailabilitySummary = async (req, res, next) => {
  try {
    const { companyId } = req
    const { tripId } = req.params

    // Validate trip exists
    const trip = await Trip.findOne({
      _id: tripId,
      company: companyId,
      isDeleted: false,
    })

    if (!trip) {
      throw createHttpError(404, "Trip not found")
    }

    // Get all availabilities for this trip
    const availabilities = await TripAvailability.find({
      company: companyId,
      trip: tripId,
      isDeleted: false,
    })
      .populate("cabins.cabin", "name type")
      .lean()

    // Summarize by type
    const summary = {
      passenger: {
        total: 0,
        allocated: 0,
        remaining: trip.remainingPassengerSeats,
      },
      cargo: {
        total: 0,
        allocated: 0,
        remaining: trip.remainingCargoSeats,
      },
      vehicle: {
        total: 0,
        allocated: 0,
        remaining: trip.remainingVehicleSeats,
      },
    }

    availabilities.forEach((av) => {
      av.cabins.forEach((cabin) => {
        summary[av.type].total += cabin.seats
        summary[av.type].allocated += cabin.allocatedSeats
      })
    })

    res.json({
      success: true,
      data: {
        tripId,
        summary,
        availabilities,
      },
    })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  listTripAvailabilities,
  getTripAvailabilityById,
  createTripAvailability,
  updateTripAvailability,
  deleteTripAvailability,
  getTripAvailabilitySummary,
}
