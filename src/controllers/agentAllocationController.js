const createHttpError = require("http-errors")
const mongoose = require("mongoose")
const AvailabilityAgentAllocation = require("../models/AvailabilityAgentAllocation")
const { Trip } = require("../models/Trip")
const { TripAvailability } = require("../models/TripAvailability")
const Partner = require("../models/Partner")
const { Cabin } = require("../models/Cabin")

const buildActor = (user) => ({
  id: user?.id || null,
  name: user?.name || "Unknown",
  type: user?.layer || "system",
  layer: user?.layer,
})

// GET - List all agent allocations for a trip (Marine layer only - where company is parent)
exports.listAgentAllocations = async (req, res) => {
  try {
    const { companyId } = req
    const { tripId } = req.params
    const { page = 1, limit = 10 } = req.query

    const skip = (parseInt(page) - 1) * parseInt(limit)
    const limitNum = parseInt(limit)

    // Only fetch Marine layer allocations where parentAgent is null (company is parent)
    const query = {
      company: companyId,
      trip: tripId,
      parentAgent: null, // Marine layer agents have null parentAgent (company is their parent)
      isDeleted: false,
    }

    const [allocations, total] = await Promise.all([
      AvailabilityAgentAllocation.find(query)
        .populate("agent", "name code type")
        .populate("availability", "type cabins")
        .populate("allocations.cabins.cabin", "name type")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      AvailabilityAgentAllocation.countDocuments(query),
    ])

    res.status(200).json({
      success: true,
      message: "Agent allocations fetched successfully",
      data: allocations,
      pagination: {
        page: parseInt(page),
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    })
  } catch (error) {
    console.error("[v0] Error in listAgentAllocations:", error)
    res.status(error.status || 500).json({
      success: false,
      message: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    })
  }
}

// GET - List all agent allocations for a trip (without needing availability ID) - Marine layer only
exports.listAgentAllocationsByTrip = async (req, res) => {
  try {
    const { companyId } = req
    const { tripId } = req.params
    const { page = 1, limit = 10 } = req.query

    const skip = (parseInt(page) - 1) * parseInt(limit)
    const limitNum = parseInt(limit)

    // Only fetch Marine layer allocations where parentAgent is null (company is parent)
    const query = {
      company: companyId,
      trip: tripId,
      parentAgent: null, // Marine layer agents have null parentAgent (company is their parent)
      isDeleted: false,
    }

    const [allocations, total] = await Promise.all([
      AvailabilityAgentAllocation.find(query)
        .populate("agent", "name code type")
        .populate("availability", "type cabins")
        .populate("allocations.cabins.cabin", "name type")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      AvailabilityAgentAllocation.countDocuments(query),
    ])

    res.status(200).json({
      success: true,
      message: "Agent allocations fetched successfully",
      data: allocations,
      pagination: {
        page: parseInt(page),
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    })
  } catch (error) {
    console.error("[v0] Error in listAgentAllocationsByTrip:", error)
    res.status(error.status || 500).json({
      success: false,
      message: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    })
  }
}

// GET - Get specific agent allocation
exports.getAgentAllocationById = async (req, res) => {
  try {
    const { companyId } = req
    const { tripId, allocationId } = req.params

    const allocation = await AvailabilityAgentAllocation.findOne({
      _id: allocationId,
      company: companyId,
      trip: tripId,
      isDeleted: false,
    })
      .populate("agent", "name code type")
      .populate("availability", "type cabins")
      .populate("allocations.cabins.cabin", "name type")

    if (!allocation) {
      throw createHttpError(404, "Agent allocation not found")
    }

    res.status(200).json({
      success: true,
      message: "Agent allocation fetched successfully",
      data: allocation,
    })
  } catch (error) {
    console.error("[v0] Error in getAgentAllocationById:", error)
    res.status(error.status || 500).json({
      success: false,
      message: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    })
  }
}

// POST - Create agent allocation(s) with transaction support
// Accepts: Single agent - { agent: "id", allocations: [...] }
// Accepts: Multiple agents - [{ agent: "id1", allocations: [...] }, { agent: "id2", allocations: [...] }]
exports.createAgentAllocation = async (req, res) => {
  const session = await mongoose.startSession()
  session.startTransaction()

  try {
    const { companyId, user } = req
    const { tripId } = req.params
    let agents = []

    if (Array.isArray(req.body)) {
      agents = req.body
    } else {
      const { agent, allocations } = req.body
      agents = [{ agent, allocations }]
    }

    const trip = await Trip.findOne({
      _id: tripId,
      company: companyId,
      isDeleted: false,
    }).session(session)

    if (!trip) throw createHttpError(404, "Trip not found")

    const availability = await TripAvailability.findOne({
      trip: tripId,
      company: companyId,
      isDeleted: false,
    }).session(session)

    if (!availability) throw createHttpError(404, "Availability not found")

    const createdAllocations = []

    for (const agentData of agents) {
      const { agent, allocations } = agentData

      // ✅ FIX: parentAgent logic
      let parentAgent = null
      if (user.layer !== "company") {
        parentAgent = user.agent
      }

      const allocationDoc = new AvailabilityAgentAllocation({
        company: companyId,
        trip: tripId,
        availability: availability._id,

        // ✅ FIXED
        agent: agent,

        // ✅ CRITICAL
        parentAgent,

        allocations,
        createdBy: buildActor(user),
      })

      await allocationDoc.save({ session })
      createdAllocations.push(allocationDoc)
    }

    await session.commitTransaction()

    res.status(201).json({
      success: true,
      message: "Allocations created successfully",
      data: createdAllocations,
    })
  } catch (error) {
    await session.abortTransaction()
    res.status(500).json({
      success: false,
      message: error.message,
    })
  } finally {
    session.endSession()
  }
}

// PUT - Update agent allocation with transaction support
exports.updateAgentAllocation = async (req, res) => {
  const session = await mongoose.startSession()
  session.startTransaction()

  try {
    const { companyId, user } = req
    const { allocationId } = req.params
    const { allocations } = req.body

    const allocation = await AvailabilityAgentAllocation.findOne({
      _id: allocationId,
      company: companyId,
      isDeleted: false,
    }).session(session)

    if (!allocation) throw createHttpError(404, "Allocation not found")

    let availability = await TripAvailability.findById(allocation.availability).session(session)
    if (!availability) throw createHttpError(404, "Availability not found")

    // ============================================================
    // ✅ STEP 1: REMOVE OLD ALLOCATION FROM AVAILABILITY
    // ============================================================

    for (const oldAlloc of allocation.allocations) {
      for (const cabin of oldAlloc.cabins) {
        await TripAvailability.updateOne(
          {
            _id: availability._id,
            "availabilityTypes.type": oldAlloc.type,
            "availabilityTypes.cabins.cabin": cabin.cabin,
          },
          {
            $inc: {
              "availabilityTypes.$[type].cabins.$[cabin].allocatedSeats": -cabin.allocatedSeats,
            },
          },
          {
            arrayFilters: [
              { "type.type": oldAlloc.type },
              { "cabin.cabin": cabin.cabin },
            ],
            session,
          }
        )
      }
    }

    // ============================================================
    // 🔥 STEP 2: RELOAD AVAILABILITY (FIX STALE DATA BUG)
    // ============================================================

    availability = await TripAvailability.findById(allocation.availability).session(session)

    // ============================================================
    // ✅ STEP 3: UPDATE parentAgent
    // ============================================================

    if (user.layer === "company") {
      allocation.parentAgent = null
    } else {
      allocation.parentAgent = user.agent
    }

    // ============================================================
    // ✅ STEP 4: UPDATE ALLOCATION DOCUMENT
    // ============================================================

    allocation.allocations = allocations
    allocation.updatedBy = buildActor(user)

    await allocation.save({ session })

    // ============================================================
    // ✅ STEP 5: ADD NEW ALLOCATION TO AVAILABILITY
    // ============================================================

    for (const newAlloc of allocations) {
      for (const cabin of newAlloc.cabins) {
        await TripAvailability.updateOne(
          {
            _id: availability._id,
            "availabilityTypes.type": newAlloc.type,
            "availabilityTypes.cabins.cabin": cabin.cabin,
          },
          {
            $inc: {
              "availabilityTypes.$[type].cabins.$[cabin].allocatedSeats": cabin.allocatedSeats,
            },
          },
          {
            arrayFilters: [
              { "type.type": newAlloc.type },
              { "cabin.cabin": cabin.cabin },
            ],
            session,
          }
        )
      }
    }

    // ============================================================
    // ✅ STEP 6: RESET CHILDREN (KEEP YOUR LOGIC)
    // ============================================================

    const resetChildren = async (parentId) => {
      const children = await AvailabilityAgentAllocation.find({
        parentAgent: parentId,
        company: companyId,
        isDeleted: false,
      }).session(session)

      for (const child of children) {
        child.allocations = child.allocations.map(a => ({
          type: a.type,
          cabins: a.cabins.map(c => ({
            cabin: c.cabin,
            allocatedSeats: 0,
          })),
          totalAllocatedSeats: 0,
        }))

        await child.save({ session })

        await resetChildren(child.agent)
      }
    }

    await resetChildren(allocation.agent)

    // ============================================================
    // ✅ COMMIT
    // ============================================================

    await session.commitTransaction()

    res.status(200).json({
      success: true,
      message: "Allocation updated successfully",
      data: allocation,
    })
  } catch (error) {
    await session.abortTransaction()
    res.status(500).json({
      success: false,
      message: error.message,
    })
  } finally {
    session.endSession()
  }
}

// DELETE - Delete agent allocation with transaction support
exports.deleteAgentAllocation = async (req, res) => {
  const session = await mongoose.startSession()
  session.startTransaction()
  
  try {
    const { companyId, user } = req
    const { tripId, allocationId } = req.params

    const allocation = await AvailabilityAgentAllocation.findOne({
      _id: allocationId,
      company: companyId,
      trip: tripId,
      isDeleted: false,
    }).session(session)
    if (!allocation) throw createHttpError(404, "Agent allocation not found")

    const availability = await TripAvailability.findById(allocation.availability).session(session)
    if (!availability) throw createHttpError(404, "Availability not found")

    const trip = await Trip.findById(tripId).session(session)
    if (!trip) throw createHttpError(404, "Trip not found")

    // Restore allocation seats back to availability
    // Agent allocations do NOT affect trip operational capacity, only restore available seats
    for (const allocationEntry of allocation.allocations) {
      const availTypeIndex = availability.availabilityTypes.findIndex(at => at.type === allocationEntry.type)
      
      for (const cabin of allocationEntry.cabins) {
        const cabinIndex = availability.availabilityTypes[availTypeIndex].cabins.findIndex(c => {
          const cabinId = c.cabin && c.cabin._id ? c.cabin._id.toString() : (c.cabin ? c.cabin.toString() : null)
          const requestCabinId = cabin.cabin.toString()
          return cabinId === requestCabinId
        })
        
        if (cabinIndex >= 0) {
          await TripAvailability.updateOne(
            { _id: allocation.availability },
            {
              $inc: {
                [`availabilityTypes.${availTypeIndex}.cabins.${cabinIndex}.allocatedSeats`]: -cabin.allocatedSeats
              }
            },
            { session }
          )
        }
      }
    }

    allocation.isDeleted = true
    allocation.updatedBy = buildActor(user)
    await allocation.save({ session })

    // Commit transaction
    await session.commitTransaction()

    // Build availability summary for all types after deletion
    const updatedAvailability = await TripAvailability.findById(allocation.availability)

    const availabilitySummary = updatedAvailability.availabilityTypes.map(availType => ({
      type: availType.type,
      cabins: availType.cabins.map(cabin => ({
        cabin: cabin.cabin,
        cabinName: cabin.cabin ? cabin.cabin.name : 'N/A',
        cabinType: cabin.cabin ? cabin.cabin.type : 'N/A',
        totalSeats: cabin.seats,
        allocatedSeats: cabin.allocatedSeats,
        remainingSeats: cabin.seats - cabin.allocatedSeats,
      }))
    }))

    res.status(200).json({
      success: true,
      message: "Agent allocation deleted successfully",
      data: {
        allocationId: allocation._id,
        availabilitySummary,
      },
    })
  } catch (error) {
    await session.abortTransaction()
    
    console.error("[v0] Error in deleteAgentAllocation:", error)
    res.status(error.status || 500).json({
      success: false,
      message: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    })
  } finally {
    await session.endSession()
  }
}

// POST - Create bulk agent allocations for multiple agents
exports.createBulkAgentAllocations = async (req, res) => {
  const session = await mongoose.startSession()
  session.startTransaction()
  
  try {
    const { companyId, user } = req
    const { tripId, availabilityId } = req.params
    const agentAllocations = req.body // Array of {agent: id, allocations: [...]}

    // Validate input
    if (!Array.isArray(agentAllocations) || agentAllocations.length === 0) {
      throw createHttpError(400, "Array of agent allocations is required")
    }

    // Verify trip exists
    const trip = await Trip.findOne({
      _id: tripId,
      company: companyId,
      isDeleted: false,
    }).session(session)
    if (!trip) throw createHttpError(404, "Trip not found")

    // Fetch availability once
    const availability = await TripAvailability.findOne({
      trip: tripId,
      company: companyId,
      isDeleted: false,
    }).session(session).populate("availabilityTypes.cabins.cabin", "name type")
    
    if (!availability) {
      throw createHttpError(404, `No availability found for this trip`)
    }

    const createdAllocations = []
    const errors = []

    // Process each agent allocation
    for (const { agent, allocations } of agentAllocations) {
      try {
        // Validate agent field exists
        if (!agent || !allocations || !Array.isArray(allocations) || allocations.length === 0) {
          errors.push({
            agent,
            error: "Agent ID and allocations array are required",
          })
          continue
        }

        // Verify agent exists and belongs to company
        const agentDoc = await Partner.findOne({
          _id: agent,
          company: companyId,
          status: "Active",
          isDeleted: false,
        }).session(session)
        if (!agentDoc) {
          errors.push({
            agent,
            error: "Agent not found or inactive",
          })
          continue
        }

        // Validate allocations
        const processedAllocations = []

        for (const allocationEntry of allocations) {
          const { type, cabins: cabinAllocations } = allocationEntry

          if (!type || !cabinAllocations || !Array.isArray(cabinAllocations)) {
            throw createHttpError(400, `Invalid allocation format for agent ${agent}. Each must have type and cabins array`)
          }

          // Find the specific availability type within the document
          const availType = availability.availabilityTypes.find(at => at.type === type)
          if (!availType) {
            throw createHttpError(404, `No ${type} availability found for this trip`)
          }

          const processedCabins = []
          let totalAllocatedSeats = 0

          for (const cabinEntry of cabinAllocations) {
            const { cabin, allocatedSeats } = cabinEntry

            // Verify cabin exists and is of correct type
            const cabinDoc = await Cabin.findOne({
              _id: cabin,
              company: companyId,
              type,
              isDeleted: false,
            }).session(session)
            if (!cabinDoc) {
              throw createHttpError(404, `Cabin not found or type mismatch for cabin ID: ${cabin}`)
            }

            const seatsNum = parseInt(allocatedSeats)
            if (isNaN(seatsNum) || seatsNum < 0) {
              throw createHttpError(400, `Allocated seats must be a non-negative number for cabin ${cabinDoc.name}`)
            }

            // Validate against availability type cabins
            const availabilityCabin = availType.cabins.find(c => {
              const cabinId = c.cabin && c.cabin._id ? c.cabin._id.toString() : (c.cabin ? c.cabin.toString() : null)
              const requestCabinId = cabin.toString()
              return cabinId === requestCabinId
            })
            if (!availabilityCabin) {
              throw createHttpError(
                400,
                `Cabin ${cabinDoc.name} is not available in this availability type for allocation`
              )
            }

            // Validate against availability: can only allocate what's not already allocated
            if (seatsNum > availabilityCabin.seats - availabilityCabin.allocatedSeats) {
              throw createHttpError(
                400,
                `Cannot allocate ${seatsNum} seats to cabin ${cabinDoc.name}. Only ${availabilityCabin.seats - availabilityCabin.allocatedSeats} seats available.`
              )
            }

            totalAllocatedSeats += seatsNum
            processedCabins.push({
              cabin,
              allocatedSeats: seatsNum,
            })
          }

          processedAllocations.push({
            type,
            cabins: processedCabins,
            totalAllocatedSeats,
            availTypeIndex: availability.availabilityTypes.findIndex(at => at.type === type),
          })
        }

        // Create allocation document for this agent
   // 🔥 Determine parentAgent from logged-in user
let parentAgent = null

if (user?.agent) {
  parentAgent = user.agent
}

const allocationData = {
  company: companyId,
  trip: tripId,
  availability: availability._id,
  agent: agent,

  // ✅ FIXED
  parentAgent,

  allocations: processedAllocations.map(p => ({
    type: p.type,
    cabins: p.cabins,
    totalAllocatedSeats: p.totalAllocatedSeats,
  })),

  createdBy: buildActor(user),
}

        const newAllocation = new AvailabilityAgentAllocation(allocationData)
        await newAllocation.save({ session })

        // Update availability for all types within transaction
        for (const allocation of processedAllocations) {
          const availTypeIndex = availability.availabilityTypes.findIndex(at => at.type === allocation.type)
          
          for (const cabin of allocation.cabins) {
            const cabinIndex = availability.availabilityTypes[availTypeIndex].cabins.findIndex(c => {
              const cabinId = c.cabin && c.cabin._id ? c.cabin._id.toString() : (c.cabin ? c.cabin.toString() : null)
              const requestCabinId = cabin.cabin.toString()
              return cabinId === requestCabinId
            })
            
            if (cabinIndex >= 0) {
              await TripAvailability.updateOne(
                { _id: availability._id },
                {
                  $inc: {
                    [`availabilityTypes.${availTypeIndex}.cabins.${cabinIndex}.allocatedSeats`]: cabin.allocatedSeats
                  }
                },
                { session }
              )
            }
          }
        }

        createdAllocations.push({
          agentId: agent,
          allocationId: newAllocation._id,
          allocations: processedAllocations.map(p => ({
            type: p.type,
            totalAllocatedSeats: p.totalAllocatedSeats,
          })),
        })
      } catch (error) {
        errors.push({
          agent,
          error: error.message,
        })
      }
    }

    // Commit transaction
    await session.commitTransaction()

    // If there are errors and some allocations succeeded, return partial success
    // If all allocations failed, return error
    if (createdAllocations.length === 0 && errors.length > 0) {
      throw createHttpError(400, `All allocations failed: ${errors.map(e => e.error).join(", ")}`)
    }

    // Fetch updated availability
    const updatedAvailability = await TripAvailability.findById(availability._id)

    // Build availability summary for all types
    const availabilitySummary = updatedAvailability.availabilityTypes.map(availType => ({
      type: availType.type,
      cabins: availType.cabins.map(cabin => ({
        cabin: cabin.cabin,
        cabinName: cabin.cabin ? cabin.cabin.name : 'N/A',
        cabinType: cabin.cabin ? cabin.cabin.type : 'N/A',
        totalSeats: cabin.seats,
        allocatedSeats: cabin.allocatedSeats,
        remainingSeats: cabin.seats - cabin.allocatedSeats,
      }))
    }))

    res.status(201).json({
      success: true,
      message: `${createdAllocations.length} agent allocations created successfully${errors.length > 0 ? ` with ${errors.length} errors` : ""}`,
      data: {
        createdAllocations,
        ...(errors.length > 0 && { errors }),
        availabilitySummary,
      },
    })
  } catch (error) {
    // Abort transaction on error
    await session.abortTransaction()
    
    console.error("[v0] Error in createBulkAgentAllocations:", error)
    res.status(error.status || 500).json({
      success: false,
      message: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    })
  } finally {
    // End session
    await session.endSession()
  }
}

// GET - Get total availability summary for allocation
exports.getAvailabilityForAllocation = async (req, res) => {
  try {
    const { companyId } = req
    const { tripId, availabilityId } = req.params

    const availability = await TripAvailability.findOne({
      _id: availabilityId,
      company: companyId,
      trip: tripId,
      isDeleted: false,
    }).populate("cabins.cabin", "name type")

    if (!availability) throw createHttpError(404, "Availability not found")

    const trip = await Trip.findById(tripId).select("tripCapacityDetails")
    if (!trip) throw createHttpError(404, "Trip not found")

    // Calculate available seats per cabin
    const availableSummary = {
      passenger: [],
      cargo: [],
      vehicle: [],
    }

    if (availability.type === "passenger") {
      availability.cabins.forEach(cabin => {
        const available = cabin.seats - cabin.allocatedSeats
        availableSummary.passenger.push({
          cabin: cabin.cabin,
          totalSeats: cabin.seats,
          allocatedSeats: cabin.allocatedSeats,
          availableSeats: available,
        })
      })
    } else if (availability.type === "cargo") {
      availability.cabins.forEach(cabin => {
        const available = cabin.seats - cabin.allocatedSeats
        availableSummary.cargo.push({
          cabin: cabin.cabin,
          totalSeats: cabin.seats,
          allocatedSeats: cabin.allocatedSeats,
          availableSeats: available,
        })
      })
    } else if (availability.type === "vehicle") {
      availability.cabins.forEach(cabin => {
        const available = cabin.seats - cabin.allocatedSeats
        availableSummary.vehicle.push({
          cabin: cabin.cabin,
          totalSeats: cabin.seats,
          allocatedSeats: cabin.allocatedSeats,
          availableSeats: available,
        })
      })
    }

    res.status(200).json({
      success: true,
      message: "Availability summary for allocation fetched successfully",
      data: {
        availabilityId,
        availabilityType: availability.type,
        totalSummary: availableSummary,
        tripCapacityDetails: trip.tripCapacityDetails,
      },
    })
  } catch (error) {
    console.error("[v0] Error in getAvailabilityForAllocation:", error)
    res.status(error.status || 500).json({
      success: false,
      message: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    })
  }
}
