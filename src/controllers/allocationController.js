const createHttpError = require("http-errors")
const mongoose = require("mongoose")
const { TripAgentAllocation } = require("../models/TripAgentAllocation")
const { TripAvailability } = require("../models/TripAvailability")
const { Trip } = require("../models/Trip")
const { Partner } = require("../models/Partner")
const tripService = require("../services/tripService")

/**
 * Helper function to build actor object
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
 * Validate allocation quantity against capacity
 * @throws if allocation exceeds available capacity
 */
async function validateAllocationCapacity(availabilityId, requestedQuantity, excludeAllocationId = null) {
  const availability = await TripAvailability.findById(availabilityId)
  if (!availability) {
    throw createHttpError(404, "Availability not found")
  }

  // Get current total allocated
  let totalAllocated = await tripService.getTotalAllocatedQuantity(availabilityId)

  // If updating, subtract the old quantity
  if (excludeAllocationId) {
    const allocation = await TripAgentAllocation.findById(excludeAllocationId)
    if (allocation) {
      const allocItem = allocation.allocations.find(
        (a) => a.availabilityId.toString() === availabilityId.toString()
      )
      if (allocItem) {
        totalAllocated -= allocItem.quantity
      }
    }
  }

  const newTotal = totalAllocated + requestedQuantity
  if (newTotal > availability.totalCapacity) {
    throw createHttpError(
      400,
      `Allocation exceeds capacity. Total capacity: ${availability.totalCapacity}, Current allocated: ${totalAllocated}, Requested: ${requestedQuantity}`
    )
  }
}

/**
 * POST /api/trips/:tripId/allocations
 * Create agent allocation for a trip
 */
const createAllocation = async (req, res, next) => {
  try {
    const { tripId } = req.params
    const { companyId } = req
    const { partner, allocations } = req.body

    if (!mongoose.Types.ObjectId.isValid(tripId)) {
      throw createHttpError(400, "Invalid trip ID format")
    }

    if (!partner) {
      throw createHttpError(400, "Missing required field: partner")
    }

    if (!Array.isArray(allocations) || allocations.length === 0) {
      throw createHttpError(400, "Allocations must be a non-empty array")
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

    // Verify partner exists
    const partnerDoc = await Partner.findOne({
      _id: partner,
      company: companyId,
      isDeleted: false,
    }).lean()

    if (!partnerDoc) {
      throw createHttpError(404, "Partner not found")
    }

    // Check if allocation already exists for this partner
    const existingAllocation = await TripAgentAllocation.findOne({
      trip: tripId,
      partner,
      isDeleted: false,
    }).lean()

    if (existingAllocation) {
      throw createHttpError(409, "Allocation already exists for this partner on this trip")
    }

    // Validate each allocation item
    for (const alloc of allocations) {
      if (!alloc.availabilityId || !mongoose.Types.ObjectId.isValid(alloc.availabilityId)) {
        throw createHttpError(400, "Invalid or missing availabilityId in allocations")
      }

      if (typeof alloc.quantity !== "number" || alloc.quantity <= 0) {
        throw createHttpError(400, "Quantity must be a positive number")
      }

      // Verify availability belongs to this trip
      const availability = await TripAvailability.findOne({
        _id: alloc.availabilityId,
        trip: tripId,
        isDeleted: false,
      }).lean()

      if (!availability) {
        throw createHttpError(404, `Availability ${alloc.availabilityId} not found for this trip`)
      }

      // Validate capacity
      await validateAllocationCapacity(alloc.availabilityId, alloc.quantity)
    }

    // Create allocation
    const newAllocation = new TripAgentAllocation({
      company: companyId,
      trip: tripId,
      partner,
      allocations: allocations.map((a) => ({
        availabilityId: a.availabilityId,
        quantity: a.quantity,
        soldQuantity: a.soldQuantity || 0,
      })),
    })

    await newAllocation.save()

    // Update remaining capacity for all affected availabilities
    for (const alloc of allocations) {
      await tripService.updateRemainingCapacity(alloc.availabilityId)
    }

    res.status(201).json({
      success: true,
      message: "Agent allocation created successfully",
      data: newAllocation.toObject(),
    })
  } catch (error) {
    next(error)
  }
}

/**
 * GET /api/trips/:tripId/allocations
 * List all allocations for a trip
 */
const listAllocations = async (req, res, next) => {
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

    const allocations = await TripAgentAllocation.find({
      trip: tripId,
      isDeleted: false,
    })
      .populate("partner", "name")
      .populate("allocations.availabilityId", "availabilityType totalCapacity bookedQuantity")
      .lean()

    res.status(200).json({
      success: true,
      message: "Allocations retrieved successfully",
      data: allocations,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * PUT /api/trips/:tripId/allocations/:allocationId
 * Update an agent allocation
 */
const updateAllocation = async (req, res, next) => {
  try {
    const { tripId, allocationId } = req.params
    const { companyId } = req
    const { allocations } = req.body

    if (!mongoose.Types.ObjectId.isValid(tripId)) {
      throw createHttpError(400, "Invalid trip ID format")
    }

    if (!mongoose.Types.ObjectId.isValid(allocationId)) {
      throw createHttpError(400, "Invalid allocation ID format")
    }

    if (!Array.isArray(allocations) || allocations.length === 0) {
      throw createHttpError(400, "Allocations must be a non-empty array")
    }

    // Fetch the allocation
    const allocation = await TripAgentAllocation.findOne({
      _id: allocationId,
      trip: tripId,
      company: companyId,
      isDeleted: false,
    })

    if (!allocation) {
      throw createHttpError(404, "Allocation not found")
    }

    // Validate new allocations
    const oldAllocations = new Map(
      allocation.allocations.map((a) => [a.availabilityId.toString(), a.quantity])
    )

    for (const alloc of allocations) {
      if (!alloc.availabilityId || !mongoose.Types.ObjectId.isValid(alloc.availabilityId)) {
        throw createHttpError(400, "Invalid or missing availabilityId in allocations")
      }

      if (typeof alloc.quantity !== "number" || alloc.quantity <= 0) {
        throw createHttpError(400, "Quantity must be a positive number")
      }

      // Verify availability belongs to this trip
      const availability = await TripAvailability.findOne({
        _id: alloc.availabilityId,
        trip: tripId,
        isDeleted: false,
      }).lean()

      if (!availability) {
        throw createHttpError(404, `Availability ${alloc.availabilityId} not found for this trip`)
      }

      // Get the difference in quantity
      const oldQuantity = oldAllocations.get(alloc.availabilityId.toString()) || 0
      const quantityDifference = alloc.quantity - oldQuantity

      // Only validate if adding more
      if (quantityDifference > 0) {
        await validateAllocationCapacity(alloc.availabilityId, quantityDifference, allocationId)
      }
    }

    // Update allocation
    allocation.allocations = allocations.map((a) => ({
      availabilityId: a.availabilityId,
      quantity: a.quantity,
      soldQuantity: a.soldQuantity !== undefined ? a.soldQuantity : 0,
    }))

    await allocation.save()

    // Update remaining capacity for all affected availabilities
    const allAvailabilityIds = new Set([
      ...allocations.map((a) => a.availabilityId.toString()),
      ...oldAllocations.keys(),
    ])

    for (const availId of allAvailabilityIds) {
      await tripService.updateRemainingCapacity(availId)
    }

    res.status(200).json({
      success: true,
      message: "Allocation updated successfully",
      data: allocation.toObject(),
    })
  } catch (error) {
    next(error)
  }
}

/**
 * DELETE /api/trips/:tripId/allocations/:allocationId
 * Delete an agent allocation
 */
const deleteAllocation = async (req, res, next) => {
  try {
    const { tripId, allocationId } = req.params
    const { companyId } = req

    if (!mongoose.Types.ObjectId.isValid(tripId)) {
      throw createHttpError(400, "Invalid trip ID format")
    }

    if (!mongoose.Types.ObjectId.isValid(allocationId)) {
      throw createHttpError(400, "Invalid allocation ID format")
    }

    const allocation = await TripAgentAllocation.findOne({
      _id: allocationId,
      trip: tripId,
      company: companyId,
      isDeleted: false,
    })

    if (!allocation) {
      throw createHttpError(404, "Allocation not found")
    }

    // Soft delete
    allocation.isDeleted = true
    await allocation.save()

    // Update remaining capacity for all affected availabilities
    for (const alloc of allocation.allocations) {
      await tripService.updateRemainingCapacity(alloc.availabilityId)
    }

    res.status(200).json({
      success: true,
      message: "Allocation deleted successfully",
      data: { _id: allocation._id, deletedAt: new Date() },
    })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  createAllocation,
  listAllocations,
  updateAllocation,
  deleteAllocation,
}
