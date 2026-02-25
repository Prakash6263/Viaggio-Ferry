const createHttpError = require("http-errors")
const mongoose = require("mongoose")
const { Trip, TRIP_STATUS } = require("../models/Trip")
const { TripAvailability, AVAILABILITY_TYPE } = require("../models/TripAvailability")
const { TripAgentAllocation } = require("../models/TripAgentAllocation")
const { Ship } = require("../models/Ship")
const { Port } = require("../models/Port")
const { Partner } = require("../models/Partner")

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
 * Validate Trip dates
 * @throws if validation fails
 */
function validateTripDates(tripData) {
  const {
    departureDateTime,
    arrivalDateTime,
    bookingOpeningDate,
    bookingClosingDate,
    boardingClosingDate,
  } = tripData

  // departureDateTime < arrivalDateTime
  if (new Date(departureDateTime) >= new Date(arrivalDateTime)) {
    throw createHttpError(400, "Departure time must be before arrival time")
  }

  // bookingOpeningDate <= bookingClosingDate
  if (bookingOpeningDate && bookingClosingDate) {
    if (new Date(bookingOpeningDate) > new Date(bookingClosingDate)) {
      throw createHttpError(400, "Booking opening date must be before or equal to booking closing date")
    }
  }

  // boardingClosingDate <= departureDateTime
  if (boardingClosingDate) {
    if (new Date(boardingClosingDate) > new Date(departureDateTime)) {
      throw createHttpError(400, "Boarding closing date must be before or equal to departure time")
    }
  }
}

/**
 * Fetch and validate ship
 * @throws if ship not found or invalid
 */
async function validateShip(shipId, companyId) {
  if (!mongoose.Types.ObjectId.isValid(shipId)) {
    throw createHttpError(400, "Invalid ship ID format")
  }

  const ship = await Ship.findOne({
    _id: shipId,
    company: companyId,
    status: "Active",
    isDeleted: false,
  }).lean()

  if (!ship) {
    throw createHttpError(404, "Ship not found, inactive, or belongs to different company")
  }

  return ship
}

/**
 * Fetch and validate port
 * @throws if port not found
 */
async function validatePort(portId, companyId) {
  if (!mongoose.Types.ObjectId.isValid(portId)) {
    throw createHttpError(400, "Invalid port ID format")
  }

  const port = await Port.findOne({
    _id: portId,
    company: companyId,
    isDeleted: false,
  }).lean()

  if (!port) {
    throw createHttpError(404, "Port not found or belongs to different company")
  }

  return port
}

/**
 * Auto-generate TripAvailability from Ship capacities
 * @param {Object} trip - Created trip document
 * @param {Object} ship - Ship document
 * @returns {Array} Array of created TripAvailability documents
 */
async function autoGenerateTripAvailability(trip, ship, companyId) {
  const availabilityRecords = []

  // Passenger Capacity
  if (ship.passengerCapacity && Array.isArray(ship.passengerCapacity)) {
    for (const passenger of ship.passengerCapacity) {
      const availability = new TripAvailability({
        company: companyId,
        trip: trip._id,
        availabilityType: "PASSENGER",
        cabinId: passenger.cabinId,
        totalCapacity: passenger.seats || 0,
        bookedQuantity: 0,
        remainingCapacity: passenger.seats || 0,
      })
      await availability.save()
      availabilityRecords.push(availability)
    }
  }

  // Cargo Capacity
  if (ship.cargoCapacity && Array.isArray(ship.cargoCapacity)) {
    for (const cargo of ship.cargoCapacity) {
      const availability = new TripAvailability({
        company: companyId,
        trip: trip._id,
        availabilityType: "CARGO",
        cabinId: cargo.cabinId,
        totalCapacity: cargo.spots || 0,
        bookedQuantity: 0,
        remainingCapacity: cargo.spots || 0,
      })
      await availability.save()
      availabilityRecords.push(availability)
    }
  }

  // Vehicle Capacity
  if (ship.vehicleCapacity && Array.isArray(ship.vehicleCapacity)) {
    for (const vehicle of ship.vehicleCapacity) {
      const availability = new TripAvailability({
        company: companyId,
        trip: trip._id,
        availabilityType: "VEHICLE",
        cabinId: vehicle.cabinId,
        totalCapacity: vehicle.spots || 0,
        bookedQuantity: 0,
        remainingCapacity: vehicle.spots || 0,
      })
      await availability.save()
      availabilityRecords.push(availability)
    }
  }

  return availabilityRecords
}

/**
 * Get total allocated quantity for an availability across all partners
 * @param {ObjectId} availabilityId - TripAvailability ID
 * @returns {number} Total allocated quantity
 */
async function getTotalAllocatedQuantity(availabilityId) {
  const allocations = await TripAgentAllocation.aggregate([
    {
      $match: {
        isDeleted: false,
        "allocations.availabilityId": new mongoose.Types.ObjectId(availabilityId),
      },
    },
    {
      $unwind: "$allocations",
    },
    {
      $match: {
        "allocations.availabilityId": new mongoose.Types.ObjectId(availabilityId),
      },
    },
    {
      $group: {
        _id: null,
        totalAllocated: { $sum: "$allocations.quantity" },
      },
    },
  ])

  return allocations.length > 0 ? allocations[0].totalAllocated : 0
}

/**
 * Calculate remaining capacity for availability
 * @param {Object} availability - TripAvailability document
 * @returns {number} Remaining capacity
 */
async function calculateRemainingCapacity(availability) {
  const totalAllocated = await getTotalAllocatedQuantity(availability._id)
  return availability.totalCapacity - availability.bookedQuantity - totalAllocated
}

/**
 * Update remaining capacity for an availability
 * @param {ObjectId} availabilityId - TripAvailability ID
 */
async function updateRemainingCapacity(availabilityId) {
  const availability = await TripAvailability.findById(availabilityId)
  if (!availability) {
    throw createHttpError(404, "Availability not found")
  }

  const remaining = await calculateRemainingCapacity(availability)
  availability.remainingCapacity = remaining
  await availability.save()
}

/**
 * Validate that deletion is allowed (no bookings, no allocations)
 * @param {ObjectId} tripId - Trip ID
 * @throws if trip has bookings or allocations
 */
async function validateCanDeleteTrip(tripId) {
  const allocations = await TripAgentAllocation.countDocuments({
    trip: tripId,
    isDeleted: false,
  })

  if (allocations > 0) {
    throw createHttpError(400, "Cannot delete trip. Agent allocations exist.")
  }

  // Note: Booking validation would depend on your Booking model structure
  // For now, we check allocations which is the primary constraint
}

/**
 * Validate trip edit constraints
 * @param {Object} trip - Trip document
 * @param {Object} updates - Update data
 * @throws if edit not allowed
 */
async function validateTripEdit(trip, updates) {
  // Cannot edit if COMPLETED
  if (trip.status === "COMPLETED") {
    throw createHttpError(400, "Cannot edit completed trips")
  }

  // If ship is being changed, validate no bookings or allocations
  if (updates.ship && updates.ship.toString() !== trip.ship.toString()) {
    const allocations = await TripAgentAllocation.countDocuments({
      trip: trip._id,
      isDeleted: false,
    })

    if (allocations > 0) {
      throw createHttpError(400, "Cannot change ship. Agent allocations exist.")
    }

    // Booking check would go here
  }
}

module.exports = {
  buildActor,
  validateTripDates,
  validateShip,
  validatePort,
  autoGenerateTripAvailability,
  getTotalAllocatedQuantity,
  calculateRemainingCapacity,
  updateRemainingCapacity,
  validateCanDeleteTrip,
  validateTripEdit,
}
