const mongoose = require("mongoose")
const Partner = require("../models/Partner")
const AvailabilityAgentAllocation = require("../models/AvailabilityAgentAllocation")

/**
 * Calculate remaining seats based on allocation hierarchy
 * 
 * CRITICAL ALGORITHM:
 * 
 * Hierarchy structure: Company → Marine → Commercial → Agent
 * 
 * For Partner Users:
 * 1. Build allocation chain from current partner up to company using parentAgent
 * 2. For each level in the allocation chain:
 *    remaining = allocatedSeats - usedByChildren
 * 3. Final available seats = MIN(remaining across all hierarchy levels)
 * 4. Build breakdown showing each level's remaining seats
 * 
 * @param {Object} params
 * @param {string} params.companyId - Company ID
 * @param {string} params.tripId - Trip ID
 * @param {string} params.cabinId - Cabin ID
 * @param {string} params.category - Category type (passenger/vehicle/cargo)
 * @param {number} params.companyRemaining - Company's remaining seats
 * @param {string} params.partnerId - Partner/Agent ID (for partner users)
 * @returns {Promise<{availableSeats, availabilityBreakdown}>}
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
    // Company user - return company remaining only
    return {
      availableSeats: Math.max(0, companyRemaining),
      totalAvailable: Math.max(0, companyRemaining),
      availabilityBreakdown,
      finalAvailableSeats: Math.max(0, companyRemaining),
    }
  }

  // For partner users, build complete hierarchy chain from partner up through parentAgent relationships
  try {
    const companyIdObj = new mongoose.Types.ObjectId(companyId)
    const tripIdObj = new mongoose.Types.ObjectId(tripId)
    const cabinIdObj = new mongoose.Types.ObjectId(cabinId)
    const partnerIdObj = new mongoose.Types.ObjectId(partnerId)

    console.log("[v0] Starting hierarchy calculation for partner:", {
      partnerId: partnerIdObj.toString(),
      tripId: tripIdObj.toString(),
      cabinId: cabinIdObj.toString(),
      category,
    })

    // Build allocation chain starting from current partner
    // Walk up using parentAgent to find all parent allocations
    let iterations = 0
    const maxIterations = 10

    // First find the current agent's allocation record
    const currentAllocation = await AvailabilityAgentAllocation.findOne({
      company: companyIdObj,
      trip: tripIdObj,
      agent: partnerIdObj,
      isDeleted: false,
    })
      .populate("agent", "layer")
      .lean()

    console.log("[v0] Current agent allocation found:", {
      found: !!currentAllocation,
      agentId: currentAllocation?.agent._id.toString(),
    })

    if (!currentAllocation) {
      // No allocation found for this partner - return company level only
      console.log("[v0] No allocation found for partner, returning company level only")
      return {
        availableSeats: Math.max(0, companyRemaining),
        totalAvailable: Math.max(0, companyRemaining),
        availabilityBreakdown,
        finalAvailableSeats: Math.max(0, companyRemaining),
      }
    }

    // Build allocation chain by walking UP the hierarchy using parentAgent
    const allocationChain = []
    
    // Add current allocation first
    allocationChain.push(currentAllocation)
    
    console.log("[v0] Starting chain walk from agent:", {
      agentId: partnerIdObj.toString(),
      parentAgent: currentAllocation.parentAgent?.toString(),
    })

    // Walk up the hierarchy chain using parentAgent references
    let currentParentId = currentAllocation.parentAgent
    iterations = 0
    
    while (currentParentId && iterations < maxIterations) {
      const parentAllocation = await AvailabilityAgentAllocation.findOne({
        company: companyIdObj,
        trip: tripIdObj,
        agent: currentParentId,
        isDeleted: false,
      })
        .populate("agent", "layer")
        .lean()

      if (!parentAllocation) {
        console.log("[v0] Parent allocation not found for agent:", {
          agentId: currentParentId.toString(),
        })
        // Parent doesn't have an allocation, but might still be in the hierarchy
        // Continue looking up in case higher levels exist
        break
      }

      allocationChain.push(parentAllocation)
      console.log("[v0] Added parent allocation to chain:", {
        iteration: iterations,
        agentId: parentAllocation.agent._id.toString(),
        layer: parentAllocation.agent.layer,
        parentAgent: parentAllocation.parentAgent?.toString(),
      })

      // Move up to next parent
      currentParentId = parentAllocation.parentAgent
      iterations++
    }

    // Reverse to get company-first order
    allocationChain.reverse()

    console.log("[v0] Built allocation chain (company to agent):", {
      chainLength: allocationChain.length,
      layers: allocationChain.map((a) => ({
        agentId: a.agent._id.toString(),
        layer: a.agent.layer,
        parentAgent: a.parentAgent?.toString(),
      })),
    })

    // Calculate remaining for each allocation level
    for (const allocation of allocationChain) {
      const agentId = allocation.agent._id
      const layer = allocation.agent.layer
      const levelName = layer.toLowerCase()

      // Find this level's allocation for the specified category and cabin
      const categoryAlloc = allocation.allocations?.find(
        (a) => a.type === category
      )

      if (!categoryAlloc) {
        console.log("[v0] No category allocation for:", {
          layer: levelName,
          agentId: agentId.toString(),
          category,
        })
        // Even without this category, we need to include this level in breakdown
        // with 0 allocated, so it contributes to the MIN calculation
        availabilityBreakdown.push({
          level: levelName,
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

      // Get allocated to this level (0 if cabin not found)
      const allocated = cabinAlloc?.allocatedSeats || 0

      // Get sum of children allocations (allocations where parentAgent = this agent)
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
            totalChildAllocated: { $sum: "$allocations.cabins.allocatedSeats" },
          },
        },
      ])

      const usedByChildren = childrenResult[0]?.totalChildAllocated || 0
      const remaining = Math.max(0, allocated - usedByChildren)

      availabilityBreakdown.push({
        level: levelName,
        allocated,
        usedByChildren,
        remaining,
      })

      hierarchyRemainings.push(remaining)

      console.log("[v0] Hierarchy level calculation:", {
        level: levelName,
        agentId: agentId.toString(),
        allocated,
        usedByChildren,
        remaining,
      })
    }

    // Final available seats = MIN of all hierarchy levels
    const finalAvailableSeats = Math.max(0, Math.min(...hierarchyRemainings))

    console.log("[v0] Final hierarchy calculation:", {
      hierarchyRemainings,
      finalAvailableSeats,
      breakdownLevels: availabilityBreakdown.map((b) => ({ level: b.level, remaining: b.remaining })),
    })

    return {
      availableSeats: finalAvailableSeats,
      totalAvailable: finalAvailableSeats,
      availabilityBreakdown,
      finalAvailableSeats,
    }
  } catch (error) {
    console.error("[v0] Error calculating hierarchy remaining:", error.message)
    console.error("[v0] Stack:", error.stack)
    // Return company level on error
    return {
      availableSeats: Math.max(0, companyRemaining),
      totalAvailable: Math.max(0, companyRemaining),
      availabilityBreakdown,
      finalAvailableSeats: Math.max(0, companyRemaining),
    }
  }
}

module.exports = calculateHierarchyRemaining
