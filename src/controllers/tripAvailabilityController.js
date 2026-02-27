const createHttpError = require("http-errors")
const mongoose = require("mongoose")
const { TripAvailability, AVAILABILITY_TYPE } = require("../models/TripAvailability")
const { Trip } = require("../models/Trip")
const { Cabin } = require("../models/Cabin")

function buildActor(user) {
  if (!user) {
    return { type: "system", name: "System" }
  }
  if (user.role === "company") {
    return { id: user.id, name: user.email, type: "company" }
  }
  return { id: user.id, name: user.email, type: "user", layer: user.layer }
}

const listTripAvailabilities = async (req, res, next) => {
  try {
    const { companyId } = req
    const { tripId } = req.params
    const { type, page = 1, limit = 10, search = "" } = req.query

    const trip = await Trip.findOne({ _id: tripId, company: companyId, isDeleted: false })
    if (!trip) throw createHttpError(404, "Trip not found")

    const query = { company: companyId, trip: tripId, isDeleted: false }
    if (type) {
      if (!AVAILABILITY_TYPE.includes(type)) {
        throw createHttpError(400, `Invalid type. Must be one of: ${AVAILABILITY_TYPE.join(", ")}`)
      }
      query.type = type
    }

    if (search) {
      const cabins = await Cabin.find(
        { company: companyId, name: { $regex: search, $options: "i" }, isDeleted: false },
        { _id: 1 }
      ).lean()
      const cabinIds = cabins.map(c => c._id)
      if (cabinIds.length === 0) {
        return res.json({ success: true, data: [], pagination: { page: parseInt(page), limit: parseInt(limit), total: 0 } })
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
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
    })
  } catch (error) {
    next(error)
  }
}

const getTripAvailabilityById = async (req, res, next) => {
  try {
    const { companyId } = req
    const { tripId, availabilityId } = req.params

    const trip = await Trip.findOne({ _id: tripId, company: companyId, isDeleted: false })
    if (!trip) throw createHttpError(404, "Trip not found")

    const availability = await TripAvailability.findOne({
      _id: availabilityId,
      company: companyId,
      trip: tripId,
      isDeleted: false,
    })
      .populate("cabins.cabin", "name type")
      .populate("allocatedAgent", "name email")

    if (!availability) throw createHttpError(404, "Availability not found")

    res.json({ success: true, data: availability })
  } catch (error) {
    next(error)
  }
}

const createTripAvailability = async (req, res, next) => {
  try {
    const { companyId, user } = req
    const { tripId } = req.params
    const { availabilities } = req.body

    if (!availabilities || !Array.isArray(availabilities) || availabilities.length === 0) {
      throw createHttpError(
        400,
        "Missing required field: availabilities (array). Must contain at least one availability object with { type, cabins } structure."
      )
    }

    const trip = await Trip.findOne({ _id: tripId, company: companyId, isDeleted: false })
    if (!trip) throw createHttpError(404, "Trip not found")

    const createdAvailabilities = []

    for (const availability of availabilities) {
      const { type, cabins } = availability

      if (!type || !cabins || !Array.isArray(cabins) || cabins.length === 0) {
        throw createHttpError(
          400,
          `Invalid availability object. Each must have { type, cabins } with cabins as non-empty array.`
        )
      }

      if (!AVAILABILITY_TYPE.includes(type)) {
        throw createHttpError(400, `Invalid type: ${type}. Must be one of: ${AVAILABILITY_TYPE.join(", ")}`)
      }

      let remainingSeats = 0
      if (type === "passenger") {
        remainingSeats = trip.remainingPassengerSeats
      } else if (type === "cargo") {
        remainingSeats = trip.remainingCargoSeats
      } else if (type === "vehicle") {
        remainingSeats = trip.remainingVehicleSeats
      }

      const processedCabins = []
      let totalSeats = 0

      for (const cabinEntry of cabins) {
        const { cabin, seats } = cabinEntry

        const cabinDoc = await Cabin.findOne({
          _id: cabin,
          company: companyId,
          type: type,
          isDeleted: false,
        })

        if (!cabinDoc) {
          throw createHttpError(404, `Cabin not found or type mismatch for type: ${type}`)
        }

        const seatsNum = parseInt(seats)
        if (isNaN(seatsNum) || seatsNum < 1) {
          throw createHttpError(400, `Seats must be a positive number for cabin ${cabinDoc.name}`)
        }

        totalSeats += seatsNum
        processedCabins.push({ cabin, seats: seatsNum, allocatedSeats: 0 })
      }

      if (totalSeats > remainingSeats) {
        throw createHttpError(
          400,
          `Cannot allocate ${totalSeats} ${type} seats. Only ${remainingSeats} remaining seats available for ${type}.`
        )
      }

      const availabilityData = {
        company: companyId,
        trip: tripId,
        type,
        cabins: processedCabins,
        createdBy: buildActor(user),
      }

      const availabilityRecord = new TripAvailability(availabilityData)
      await availabilityRecord.save()

      if (type === "passenger") {
        trip.remainingPassengerSeats -= totalSeats
      } else if (type === "cargo") {
        trip.remainingCargoSeats -= totalSeats
      } else if (type === "vehicle") {
        trip.remainingVehicleSeats -= totalSeats
      }

      createdAvailabilities.push(availabilityRecord)
    }

    trip.updatedBy = buildActor(user)
    await trip.save()

    const populatedAvailabilities = await TripAvailability.find({
      _id: { $in: createdAvailabilities.map(a => a._id) },
    })
      .populate("cabins.cabin", "name type")
      .populate("allocatedAgent", "name email")

    res.status(201).json({
      success: true,
      message: `Successfully created ${createdAvailabilities.length} availability record(s)`,
      data: populatedAvailabilities,
    })
  } catch (error) {
    next(error)
  }
}

const updateTripAvailability = async (req, res, next) => {
  try {
    const { companyId, user } = req
    const { tripId, availabilityId } = req.params
    const { cabins, allocatedAgent } = req.body

    const trip = await Trip.findOne({ _id: tripId, company: companyId, isDeleted: false })
    if (!trip) throw createHttpError(404, "Trip not found")

    const availability = await TripAvailability.findOne({
      _id: availabilityId,
      company: companyId,
      trip: tripId,
      isDeleted: false,
    })

    if (!availability) throw createHttpError(404, "Availability not found")

    const oldTotalSeats = availability.cabins.reduce((sum, c) => sum + c.seats, 0)

    if (cabins !== undefined && Array.isArray(cabins) && cabins.length > 0) {
      const processedCabins = []
      let newTotalSeats = 0

      for (const cabinEntry of cabins) {
        const { cabin, seats } = cabinEntry

        const cabinDoc = await Cabin.findOne({
          _id: cabin,
          company: companyId,
          type: availability.type,
          isDeleted: false,
        })

        if (!cabinDoc) {
          throw createHttpError(404, `Cabin not found or type mismatch for type: ${availability.type}`)
        }

        const seatsNum = parseInt(seats)
        if (isNaN(seatsNum) || seatsNum < 1) {
          throw createHttpError(400, `Seats must be a positive number for cabin ${cabinDoc.name}`)
        }

        newTotalSeats += seatsNum
        processedCabins.push({ cabin, seats: seatsNum, allocatedSeats: cabinEntry.allocatedSeats || 0 })
      }

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

        if (availability.type === "passenger") {
          trip.remainingPassengerSeats -= difference
        } else if (availability.type === "cargo") {
          trip.remainingCargoSeats -= difference
        } else if (availability.type === "vehicle") {
          trip.remainingVehicleSeats -= difference
        }
      } else if (newTotalSeats < oldTotalSeats) {
        const difference = oldTotalSeats - newTotalSeats

        if (availability.type === "passenger") {
          trip.remainingPassengerSeats += difference
        } else if (availability.type === "cargo") {
          trip.remainingCargoSeats += difference
        } else if (availability.type === "vehicle") {
          trip.remainingVehicleSeats += difference
        }
      }

      availability.cabins = processedCabins
    }

    if (allocatedAgent !== undefined) {
      availability.allocatedAgent = allocatedAgent === null ? null : allocatedAgent
    }

    availability.updatedBy = buildActor(user)
    await availability.save()

    trip.updatedBy = buildActor(user)
    await trip.save()

    const updatedAvailability = await TripAvailability.findById(availabilityId)
      .populate("cabins.cabin", "name type")
      .populate("allocatedAgent", "name email")

    res.json({ success: true, message: "Availability updated successfully", data: updatedAvailability })
  } catch (error) {
    next(error)
  }
}

const deleteTripAvailability = async (req, res, next) => {
  try {
    const { companyId, user } = req
    const { tripId, availabilityId } = req.params

    const trip = await Trip.findOne({ _id: tripId, company: companyId, isDeleted: false })
    if (!trip) throw createHttpError(404, "Trip not found")

    const availability = await TripAvailability.findOne({
      _id: availabilityId,
      company: companyId,
      trip: tripId,
      isDeleted: false,
    })

    if (!availability) throw createHttpError(404, "Availability not found")

    const totalSeats = availability.cabins.reduce((sum, c) => sum + c.seats, 0)

    availability.isDeleted = true
    availability.updatedBy = buildActor(user)
    await availability.save()

    if (availability.type === "passenger") {
      trip.remainingPassengerSeats += totalSeats
    } else if (availability.type === "cargo") {
      trip.remainingCargoSeats += totalSeats
    } else if (availability.type === "vehicle") {
      trip.remainingVehicleSeats += totalSeats
    }

    trip.updatedBy = buildActor(user)
    await trip.save()

    res.json({ success: true, message: "Availability deleted successfully" })
  } catch (error) {
    next(error)
  }
}

const getTripAvailabilitySummary = async (req, res, next) => {
  try {
    const { companyId } = req
    const { tripId } = req.params

    const trip = await Trip.findOne({ _id: tripId, company: companyId, isDeleted: false })
    if (!trip) throw createHttpError(404, "Trip not found")

    const availabilities = await TripAvailability.find({
      company: companyId,
      trip: tripId,
      isDeleted: false,
    })
      .populate("cabins.cabin", "name type")
      .lean()

    const summary = {
      passenger: { total: 0, allocated: 0, remaining: trip.remainingPassengerSeats },
      cargo: { total: 0, allocated: 0, remaining: trip.remainingCargoSeats },
      vehicle: { total: 0, allocated: 0, remaining: trip.remainingVehicleSeats },
    }

    availabilities.forEach((av) => {
      av.cabins.forEach((cabin) => {
        summary[av.type].total += cabin.seats
        summary[av.type].allocated += cabin.allocatedSeats
      })
    })

    res.json({ success: true, data: { tripId, summary, availabilities } })
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
