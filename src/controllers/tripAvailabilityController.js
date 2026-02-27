const createHttpError = require("http-errors")
const mongoose = require("mongoose")
const { TripAvailability, AVAILABILITY_TYPE } = require("../models/TripAvailability")
const { Trip } = require("../models/Trip")
const { Cabin } = require("../models/Cabin")
const { Ship } = require("../models/Ship")

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

    // Get the ship to validate cabin capacities
    const ship = await Ship.findOne({ _id: trip.ship, company: companyId, isDeleted: false })
    if (!ship) throw createHttpError(404, "Ship not found for this trip")

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

      // Get ship's capacity array for this type
      let shipCapacityArray = []
      if (type === "passenger") {
        shipCapacityArray = ship.passengerCapacity || []
      } else if (type === "cargo") {
        shipCapacityArray = ship.cargoCapacity || []
      } else if (type === "vehicle") {
        shipCapacityArray = ship.vehicleCapacity || []
      }

      // Create a map of cabin ID to capacity for quick lookup
      const shipCapacityMap = {}
      shipCapacityArray.forEach(cap => {
        const capacityField = type === "passenger" ? "seats" : "spots"
        shipCapacityMap[cap.cabinId.toString()] = cap[capacityField] || 0
      })

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

        // VALIDATION 1: Check if this cabin allocation exceeds ship's cabin capacity
        const shipCabinCapacity = shipCapacityMap[cabin.toString()] || 0
        if (seatsNum > shipCabinCapacity) {
          throw createHttpError(
            400,
            `Cannot allocate ${seatsNum} ${type} seats to cabin "${cabinDoc.name}". Ship's ${cabinDoc.name} capacity is only ${shipCabinCapacity} ${type === "passenger" ? "seats" : "spots"}.`
          )
        }

        totalSeats += seatsNum
        processedCabins.push({ cabin, seats: seatsNum, allocatedSeats: 0 })
      }

      // VALIDATION 2: Check if total allocation exceeds trip's remaining seats
      if (totalSeats > remainingSeats) {
        throw createHttpError(
          400,
          `Cannot allocate ${totalSeats} ${type} seats. Only ${remainingSeats} remaining seats available for ${type} on this trip.`
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

      // Update trip's remaining seats for both aggregate and per-cabin tracking
      if (type === "passenger") {
        trip.remainingPassengerSeats -= totalSeats
      } else if (type === "cargo") {
        trip.remainingCargoSeats -= totalSeats
      } else if (type === "vehicle") {
        trip.remainingVehicleSeats -= totalSeats
      }

      // Update per-cabin remaining capacity
      for (const cabinEntry of cabins) {
        const { cabin, seats } = cabinEntry
        const cabinIdStr = cabin.toString()
        const seatsNum = parseInt(seats)

        // Find the cabin in the grouped structure
        let tripCapacityDetail = null
        if (type === "passenger") {
          tripCapacityDetail = trip.tripCapacityDetails.passenger.find(
            detail => detail.cabinId.toString() === cabinIdStr
          )
        } else if (type === "cargo") {
          tripCapacityDetail = trip.tripCapacityDetails.cargo.find(
            detail => detail.cabinId.toString() === cabinIdStr
          )
        } else if (type === "vehicle") {
          tripCapacityDetail = trip.tripCapacityDetails.vehicle.find(
            detail => detail.cabinId.toString() === cabinIdStr
          )
        }

        if (tripCapacityDetail) {
          tripCapacityDetail.remainingSeat -= seatsNum
        }
      }

      createdAvailabilities.push(availabilityRecord)
    }

    trip.updatedBy = buildActor(user)
    await trip.save()

    const populatedAvailabilities = await TripAvailability.find({
      _id: { $in: createdAvailabilities.map(a => a._id) },
    })
      .populate("cabins.cabin", "name type")

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
    const { cabins } = req.body

    const trip = await Trip.findOne({ _id: tripId, company: companyId, isDeleted: false })
    if (!trip) throw createHttpError(404, "Trip not found")

    const availability = await TripAvailability.findOne({
      _id: availabilityId,
      company: companyId,
      trip: tripId,
      isDeleted: false,
    })

    if (!availability) throw createHttpError(404, "Availability not found")

    // Get the ship to validate cabin capacities
    const ship = await Ship.findOne({ _id: trip.ship, company: companyId, isDeleted: false })
    if (!ship) throw createHttpError(404, "Ship not found for this trip")

    const oldTotalSeats = availability.cabins.reduce((sum, c) => sum + c.seats, 0)

    if (cabins !== undefined && Array.isArray(cabins) && cabins.length > 0) {
      // Get ship's capacity array for this type
      let shipCapacityArray = []
      if (availability.type === "passenger") {
        shipCapacityArray = ship.passengerCapacity || []
      } else if (availability.type === "cargo") {
        shipCapacityArray = ship.cargoCapacity || []
      } else if (availability.type === "vehicle") {
        shipCapacityArray = ship.vehicleCapacity || []
      }

      // Create a map of cabin ID to capacity for quick lookup
      const shipCapacityMap = {}
      shipCapacityArray.forEach(cap => {
        const capacityField = availability.type === "passenger" ? "seats" : "spots"
        shipCapacityMap[cap.cabinId.toString()] = cap[capacityField] || 0
      })

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

        // VALIDATION: Check if this cabin allocation exceeds ship's cabin capacity
        const shipCabinCapacity = shipCapacityMap[cabin.toString()] || 0
        if (seatsNum > shipCabinCapacity) {
          throw createHttpError(
            400,
            `Cannot allocate ${seatsNum} ${availability.type} seats to cabin "${cabinDoc.name}". Ship's ${cabinDoc.name} capacity is only ${shipCabinCapacity} ${availability.type === "passenger" ? "seats" : "spots"}.`
          )
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

        // Update per-cabin remaining capacity for new cabins
        for (const cabinEntry of cabins) {
          const { cabin, seats } = cabinEntry
          const oldCabin = availability.cabins.find(c => c.cabin.toString() === cabin.toString())
          const oldSeats = oldCabin ? oldCabin.seats : 0
          const newSeats = parseInt(seats)
          const seatDifference = newSeats - oldSeats
          const cabinIdStr = cabin.toString()

          let tripCapacityDetail = null
          if (availability.type === "passenger") {
            tripCapacityDetail = trip.tripCapacityDetails.passenger.find(
              detail => detail.cabinId.toString() === cabinIdStr
            )
          } else if (availability.type === "cargo") {
            tripCapacityDetail = trip.tripCapacityDetails.cargo.find(
              detail => detail.cabinId.toString() === cabinIdStr
            )
          } else if (availability.type === "vehicle") {
            tripCapacityDetail = trip.tripCapacityDetails.vehicle.find(
              detail => detail.cabinId.toString() === cabinIdStr
            )
          }

          if (tripCapacityDetail) {
            tripCapacityDetail.remainingSeat -= seatDifference
          }
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

        // Update per-cabin remaining capacity for reduced allocations
        for (const cabinEntry of cabins) {
          const { cabin, seats } = cabinEntry
          const oldCabin = availability.cabins.find(c => c.cabin.toString() === cabin.toString())
          const oldSeats = oldCabin ? oldCabin.seats : 0
          const newSeats = parseInt(seats)
          const seatDifference = oldSeats - newSeats
          const cabinIdStr = cabin.toString()

          let tripCapacityDetail = null
          if (availability.type === "passenger") {
            tripCapacityDetail = trip.tripCapacityDetails.passenger.find(
              detail => detail.cabinId.toString() === cabinIdStr
            )
          } else if (availability.type === "cargo") {
            tripCapacityDetail = trip.tripCapacityDetails.cargo.find(
              detail => detail.cabinId.toString() === cabinIdStr
            )
          } else if (availability.type === "vehicle") {
            tripCapacityDetail = trip.tripCapacityDetails.vehicle.find(
              detail => detail.cabinId.toString() === cabinIdStr
            )
          }

          if (tripCapacityDetail) {
            tripCapacityDetail.remainingSeat += seatDifference
          }
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

    // Restore per-cabin remaining capacity
    for (const cabin of availability.cabins) {
      const cabinIdStr = cabin.cabin.toString()
      let tripCapacityDetail = null

      if (availability.type === "passenger") {
        tripCapacityDetail = trip.tripCapacityDetails.passenger.find(
          detail => detail.cabinId.toString() === cabinIdStr
        )
      } else if (availability.type === "cargo") {
        tripCapacityDetail = trip.tripCapacityDetails.cargo.find(
          detail => detail.cabinId.toString() === cabinIdStr
        )
      } else if (availability.type === "vehicle") {
        tripCapacityDetail = trip.tripCapacityDetails.vehicle.find(
          detail => detail.cabinId.toString() === cabinIdStr
        )
      }

      if (tripCapacityDetail) {
        tripCapacityDetail.remainingSeat += cabin.seats
      }
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
