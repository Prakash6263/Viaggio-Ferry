const mongoose = require("mongoose")
const Partner = require("../models/Partner")
const AvailabilityAgentAllocation = require("../models/AvailabilityAgentAllocation")

/**
 * Calculate remaining seats based on allocation hierarchy
 * 
 * CRITICAL ALGORITHM:
 * Hierarchy: Company → Marine → Commercial → Agent
 * 
 * Formula: finalAvailableSeats = MIN(remaining across all levels)
 * Where: remaining = allocatedSeats - usedByChildren
 * 
 * Steps:
 * 1. Get current agent's allocation
 * 2. Walk UP parentAgent chain to build complete hierarchy
 * 3. For each level: calculate remaining = allocated - usedByChildren
 * 4. Apply MIN to get final available seats
 */
async function calculateHierarchyRemaining(params) {
  const {
    companyId,
    tripId,
    cabinId,
    category,
    companyRemaining,
    partnerId,
  } = params

  // Start with company level
  const availabilityBreakdown = [
    {
      level: "company",
      remaining: Math.max(0, companyRemaining),
    },
  ]
  const hierarchyRemainings = [companyRemaining]

  if (!partnerId) {
    return {
      availableSeats: Math.max(0, companyRemaining),
      totalAvailable: Math.max(0, companyRemaining),
      availabilityBreakdown,
      finalAvailableSeats: Math.max(0, companyRemaining),
    }
  }

  try {
    const companyIdObj = new mongoose.Types.ObjectId(companyId)
    const tripIdObj = new mongoose.Types.ObjectId(tripId)
    const cabinIdObj = new mongoose.Types.ObjectId(cabinId)
    const partnerIdObj = new mongoose.Types.ObjectId(partnerId)

    console.log("[v0] Starting hierarchy calculation:", {
      partnerId: partnerIdObj.toString(),
      category,
    })

    // STEP 1: Get current agent's allocation
    const currentAllocation = await AvailabilityAgentAllocation.findOne({
      company: companyIdObj,
      trip: tripIdObj,
      agent: partnerIdObj,
      isDeleted: false,
    })
      .populate("agent", "layer")
      .lean()

    console.log("[v0] Current allocation:", {
      found: !!currentAllocation,
      agentLayer: currentAllocation?.agent.layer,
      parentAgent: currentAllocation?.parentAgent?.toString(),
    })

    if (!currentAllocation) {
      console.log("[v0] No allocation for agent, returning company level only")
      return {
        availableSeats: Math.max(0, companyRemaining),
        totalAvailable: Math.max(0, companyRemaining),
        availabilityBreakdown,
        finalAvailableSeats: Math.max(0, companyRemaining),
      }
    }

    // STEP 2: Build chain by walking UP the parentAgent hierarchy
    const chainAllocations = [currentAllocation]
    let currentParentId = currentAllocation.parentAgent
    let iterations = 0

    while (currentParentId && iterations < 10) {
      console.log("[v0] Looking for parent:", {
        parentAgentId: currentParentId.toString(),
        iteration: iterations,
      })

      const parentAllocation = await AvailabilityAgentAllocation.findOne({
        company: companyIdObj,
        trip: tripIdObj,
        agent: currentParentId,
        isDeleted: false,
      })
        .populate("agent", "layer")
        .lean()

      if (!parentAllocation) {
        console.log("[v0] Parent allocation not found, stopping chain walk")
        break
      }

      chainAllocations.push(parentAllocation)
      console.log("[v0] Added parent to chain:", {
        layer: parentAllocation.agent.layer,
        parentAgentId: currentParentId.toString(),
      })

      currentParentId = parentAllocation.parentAgent
      iterations++
    }

    // Reverse to get company-first order
    chainAllocations.reverse()

    console.log("[v0] Final chain:", {
      length: chainAllocations.length,
      layers: chainAllocations.map((a) => a.agent.layer),
    })

    // STEP 3: Calculate remaining for each level in the chain
    for (const alloc of chainAllocations) {
      const agentId = alloc.agent._id
      const layer = alloc.agent.layer.toLowerCase()

      const categoryAlloc = alloc.allocations?.find((a) => a.type === category)

      if (!categoryAlloc) {
        console.log("[v0] No category for level:", { layer, category })
        availabilityBreakdown.push({
          level: layer,
          allocated: 0,
          usedByChildren: 0,
          remaining: 0,
        })
        hierarchyRemainings.push(0)
        continue
      }

      const cabinAlloc = categoryAlloc.cabins?.find(
        (c) => c.cabin.toString() === cabinIdObj.toString()
      )

      const allocated = cabinAlloc?.allocatedSeats || 0

      // Get children allocations
      const childrenResult = await AvailabilityAgentAllocation.aggregate([
        {
          $match: {
            company: companyIdObj,
            trip: tripIdObj,
            parentAgent: agentId,
            isDeleted: false,
          },
        },
        { $unwind: "$allocations" },
        { $match: { "allocations.type": category } },
        { $unwind: "$allocations.cabins" },
        {
          $match: {
            "allocations.cabins.cabin": cabinIdObj,
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$allocations.cabins.allocatedSeats" },
          },
        },
      ])

      const usedByChildren = childrenResult[0]?.total || 0
      const remaining = Math.max(0, allocated - usedByChildren)

      availabilityBreakdown.push({
        level: layer,
        allocated,
        usedByChildren,
        remaining,
      })

      hierarchyRemainings.push(remaining)

      console.log("[v0] Level calculation:", {
        layer,
        allocated,
        usedByChildren,
        remaining,
      })
    }

    // STEP 4: Apply MIN formula
    const finalAvailableSeats = Math.max(0, Math.min(...hierarchyRemainings))

    console.log("[v0] Final result:", {
      levels: hierarchyRemainings.length,
      values: hierarchyRemainings,
      final: finalAvailableSeats,
    })

    return {
      availableSeats: finalAvailableSeats,
      totalAvailable: finalAvailableSeats,
      availabilityBreakdown,
      finalAvailableSeats,
    }
  } catch (error) {
    console.error("[v0] Hierarchy error:", error.message)
    return {
      availableSeats: Math.max(0, companyRemaining),
      totalAvailable: Math.max(0, companyRemaining),
      availabilityBreakdown,
      finalAvailableSeats: Math.max(0, companyRemaining),
    }
  }
}

module.exports = calculateHierarchyRemaining
