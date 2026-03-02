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

// NEW FLOW: One availability document per trip with availabilityTypes array
const listTripAvailabilities = async (req, res, next) => {
  try {
    const { companyId } = req
    const { tripId } = req.params
    const { type, search = "" } = req.query

    const trip = await Trip.findOne({ _id: tripId, company: companyId, isDeleted: false })
    if (!trip) throw createHttpError(404, "Trip not found")

    // Find the SINGLE availability document for this trip
    const availability = await TripAvailability.findOne({
      company: companyId,
      trip: tripId,
      isDeleted: false,
    }).populate("availabilityTypes.cabins.cabin", "name type")

    if (!availability) {
      // No availability created yet for this trip
      return res.json({
        success: true,
        data: null,
        message: "No availability configured for this trip yet",
      })
    }

    let result = availability.toObject()

    // If type filter requested, return only that availability type
    if (type) {
      if (!AVAILABILITY_TYPE.includes(type)) {
        throw createHttpError(400, `Invalid type. Must be one of: ${AVAILABILITY_TYPE.join(", ")}`)
      }
      const availType = availability.availabilityTypes.find(at => at.type === type)
      if (!availType) {
        return res.json({
          success: true,
          data: null,
          message: `Availability type '${type}' not configured for this trip`,
        })
      }
      result.availabilityTypes = [availType]
    }

    // If search requested, filter cabins by name
    if (search) {
      const cabins = await Cabin.find(
        { company: companyId, name: { $regex: search, $options: "i" }, isDeleted: false },
        { _id: 1 }
      ).lean()
      const cabinIds = cabins.map(c => c._id)

      if (cabinIds.length > 0) {
        result.availabilityTypes = result.availabilityTypes.map(at => ({
          ...at,
          cabins: at.cabins.filter(c => cabinIds.some(id => id.equals(c.cabin._id || c.cabin))),
        }))
      } else {
        result.availabilityTypes = result.availabilityTypes.map(at => ({
          ...at,
          cabins: [],
        }))
      }
    }

    res.json({ success: true, data: result })
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
    }).populate("availabilityTypes.cabins.cabin", "name type")

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
    const { availabilityTypes } = req.body

    if (!availabilityTypes || !Array.isArray(availabilityTypes) || availabilityTypes.length === 0) {
      throw createHttpError(
        400,
        "Missing required field: availabilityTypes (array). Must contain at least one object with { type, cabins } structure."
      )
    }

    const trip = await Trip.findOne({ _id: tripId, company: companyId, isDeleted: false })
    if (!trip) throw createHttpError(404, "Trip not found")

    // Check if availability ALREADY EXISTS for this trip (unique constraint)
    const existingAvailability = await TripAvailability.findOne({
      trip: tripId,
      company: companyId,
      isDeleted: false,
    })
    if (existingAvailability) {
      throw createHttpError(400, "Availability already exists for this trip. Use update endpoint to modify.")
    }

    // Get the ship to validate cabin capacities
    const ship = await Ship.findOne({ _id: trip.ship, company: companyId, isDeleted: false })
    if (!ship) throw createHttpError(404, "Ship not found for this trip")

    const processedAvailabilityTypes = []

    // Validate and process each availability type
    for (const availType of availabilityTypes) {
      const { type, cabins } = availType

      if (!type || !cabins || !Array.isArray(cabins) || cabins.length === 0) {
        throw createHttpError(
          400,
          `Invalid availability type object. Each must have { type, cabins } with cabins as non-empty array.`
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

      processedAvailabilityTypes.push({ type, cabins: processedCabins })

      // Update trip's remaining seats for this type
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
    }

    // Create SINGLE availability document for this trip
    const availabilityData = {
      company: companyId,
      trip: tripId,
      availabilityTypes: processedAvailabilityTypes,
      createdBy: buildActor(user),
    }

    const availabilityRecord = new TripAvailability(availabilityData)
    await availabilityRecord.save()

    // Save updated trip
    await trip.save()

    const result = await TripAvailability.findById(availabilityRecord._id).populate(
      "availabilityTypes.cabins.cabin",
      "name type"
    )

    res.json({
      success: true,
      data: result,
      message: "Availability created successfully",
    })
  } catch (error) {
    next(error)
  }
}

const updateTripAvailability = async (req, res, next) => {
  try {
    const { companyId, user } = req
    const { tripId, availabilityId } = req.params
    const { availabilityTypes } = req.body

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

    // Store original seats per type for difference calculation
    const originalSeatsMap = {}
    availability.availabilityTypes.forEach(at => {
      originalSeatsMap[at.type] = at.cabins.reduce((sum, c) => sum + c.seats, 0)
    })

    const processedAvailabilityTypes = []

    if (availabilityTypes && Array.isArray(availabilityTypes) && availabilityTypes.length > 0) {
      // Validate and process each availability type
      for (const availType of availabilityTypes) {
        const { type, cabins } = availType

        if (!type || !cabins || !Array.isArray(cabins) || cabins.length === 0) {
          throw createHttpError(
            400,
            `Invalid availability type object. Each must have { type, cabins } with cabins as non-empty array.`
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

        const processedCabins = []
        let newTotalSeats = 0

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

          // VALIDATION: Check if this cabin allocation exceeds ship's cabin capacity
          const shipCabinCapacity = shipCapacityMap[cabin.toString()] || 0
          if (seatsNum > shipCabinCapacity) {
            throw createHttpError(
              400,
              `Cannot allocate ${seatsNum} ${type} seats to cabin "${cabinDoc.name}". Ship's ${cabinDoc.name} capacity is only ${shipCabinCapacity} ${type === "passenger" ? "seats" : "spots"}.`
            )
          }

          newTotalSeats += seatsNum
          processedCabins.push({ cabin, seats: seatsNum, allocatedSeats: cabinEntry.allocatedSeats || 0 })
        }

        const oldTotal = originalSeatsMap[type] || 0

        if (newTotalSeats > oldTotal) {
          const difference = newTotalSeats - oldTotal
          let remainingSeats = 0

          if (type === "passenger") {
            remainingSeats = trip.remainingPassengerSeats
          } else if (type === "cargo") {
            remainingSeats = trip.remainingCargoSeats
          } else if (type === "vehicle") {
            remainingSeats = trip.remainingVehicleSeats
          }

          if (difference > remainingSeats) {
            throw createHttpError(
              400,
              `Cannot increase seats by ${difference}. Only ${remainingSeats} remaining seats available.`
            )
          }

          if (type === "passenger") {
            trip.remainingPassengerSeats -= difference
          } else if (type === "cargo") {
            trip.remainingCargoSeats -= difference
          } else if (type === "vehicle") {
            trip.remainingVehicleSeats -= difference
          }
        } else if (newTotalSeats < oldTotal) {
          const difference = oldTotal - newTotalSeats

          if (type === "passenger") {
            trip.remainingPassengerSeats += difference
          } else if (type === "cargo") {
            trip.remainingCargoSeats += difference
          } else if (type === "vehicle") {
            trip.remainingVehicleSeats += difference
          }
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
            // Find old cabin entry
            const oldCabinEntry = availability.availabilityTypes
              .find(at => at.type === type)
              ?.cabins.find(c => c.cabin.toString() === cabinIdStr)

            const oldSeats = oldCabinEntry?.seats || 0
            const difference = seatsNum - oldSeats

            if (difference !== 0) {
              tripCapacityDetail.remainingSeat -= difference
            }
          }
        }

        processedAvailabilityTypes.push({ type, cabins: processedCabins })
      }
    }

    // Update availability document
    availability.availabilityTypes = processedAvailabilityTypes
    availability.updatedBy = buildActor(user)

    await availability.save()
    await trip.save()

    const result = await TripAvailability.findById(availabilityId).populate(
      "availabilityTypes.cabins.cabin",
      "name type"
    )

    res.json({
      success: true,
      data: result,
      message: "Availability updated successfully",
    })
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

    // Restore all seats to trip
    availability.availabilityTypes.forEach(at => {
      const totalSeats = at.cabins.reduce((sum, c) => sum + c.seats, 0)

      if (at.type === "passenger") {
        trip.remainingPassengerSeats += totalSeats
      } else if (at.type === "cargo") {
        trip.remainingCargoSeats += totalSeats
      } else if (at.type === "vehicle") {
        trip.remainingVehicleSeats += totalSeats
      }

      // Restore per-cabin remaining capacity
      at.cabins.forEach(cabin => {
        const cabinIdStr = cabin.cabin.toString()
        const seatsNum = cabin.seats

        let tripCapacityDetail = null
        if (at.type === "passenger") {
          tripCapacityDetail = trip.tripCapacityDetails.passenger.find(
            detail => detail.cabinId.toString() === cabinIdStr
          )
        } else if (at.type === "cargo") {
          tripCapacityDetail = trip.tripCapacityDetails.cargo.find(
            detail => detail.cabinId.toString() === cabinIdStr
          )
        } else if (at.type === "vehicle") {
          tripCapacityDetail = trip.tripCapacityDetails.vehicle.find(
            detail => detail.cabinId.toString() === cabinIdStr
          )
        }

        if (tripCapacityDetail) {
          tripCapacityDetail.remainingSeat += seatsNum
        }
      })
    })

    // Soft delete
    availability.isDeleted = true
    availability.updatedBy = buildActor(user)

    await availability.save()
    await trip.save()

    res.json({
      success: true,
      message: "Availability deleted successfully",
    })
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

    const availability = await TripAvailability.findOne({
      company: companyId,
      trip: tripId,
      isDeleted: false,
    }).populate("availabilityTypes.cabins.cabin", "name type")

    if (!availability) {
      return res.json({
        success: true,
        data: {
          tripId,
          summary: {},
          message: "No availability configured for this trip",
        },
      })
    }

    const summary = {}

    availability.availabilityTypes.forEach(at => {
      summary[at.type] = {
        totalSeats: at.cabins.reduce((sum, c) => sum + c.seats, 0),
        allocatedSeats: at.cabins.reduce((sum, c) => sum + c.allocatedSeats, 0),
        availableSeats: at.cabins.reduce((sum, c) => sum + (c.seats - c.allocatedSeats), 0),
        cabins: at.cabins.map(c => ({
          cabinName: c.cabin.name,
          cabinType: c.cabin.type,
          totalSeats: c.seats,
          allocatedSeats: c.allocatedSeats,
          availableSeats: c.seats - c.allocatedSeats,
        })),
      }
    })

    res.json({
      success: true,
      data: {
        tripId,
        summary,
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
