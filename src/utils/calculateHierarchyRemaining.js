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
    const allocationChain = []
    let currentAllocationId = null
    let iterations = 0
    const maxIterations = 10

    // First find the current agent's allocation record
    const currentAllocation = await AvailabilityAgentAllocation.findOne({
      company: companyIdObj,
      trip: tripIdObj,
      agent: partnerIdObj,
      isDeleted: false,
    }).lean()

    console.log("[v0] Current agent allocation found:", {
      found: !!currentAllocation,
      agentId: currentAllocation?.agent.toString(),
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

    // Build allocation chain from current up to company
    // Each allocation has parentAgent pointing to its parent in the hierarchy
    let currentAgentId = partnerIdObj
    let chainAllocations = []

    while (currentAgentId && iterations < maxIterations) {
      const allocation = await AvailabilityAgentAllocation.findOne({
        company: companyIdObj,
        trip: tripIdObj,
        agent: currentAgentId,
        isDeleted: false,
      }).lean()

      if (!allocation) {
        break
      }

      chainAllocations.push(allocation)
      console.log("[v0] Added allocation to chain:", {
        agentId: currentAgentId.toString(),
        parentAgent: allocation.parentAgent?.toString(),
      })

      // Move to parent agent
      currentAgentId = allocation.parentAgent
      iterations++
    }

    console.log("[v0] Built allocation chain:", {
      chainLength: chainAllocations.length,
      agents: chainAllocations.map((a) => ({
        agent: a.agent.toString(),
        parentAgent: a.parentAgent?.toString(),
      })),
    })

    // Reverse chain to process from parent to child (company → marine → commercial → agent)
    chainAllocations.reverse()

    console.log("[v0] Reversed allocation chain order (parent to child):", {
      agents: chainAllocations.map((a) => a.agent.toString()),
    })

    // Calculate remaining for each allocation level
    for (const allocation of chainAllocations) {
      // Find this level's allocation for the specified category and cabin
      const categoryAlloc = allocation.allocations?.find(
        (a) => a.type === category
      )

      if (!categoryAlloc) {
        console.log("[v0] No category allocation for agent:", {
          agentId: allocation.agent.toString(),
          category,
        })
        continue
      }

      const cabinAlloc = categoryAlloc.cabins?.find(
        (c) => c.cabin.toString() === cabinIdObj.toString()
      )

      if (!cabinAlloc) {
        console.log("[v0] No cabin allocation for agent:", {
          agentId: allocation.agent.toString(),
          cabinId: cabinIdObj.toString(),
        })
        continue
      }

      // Get allocated to this level
      const allocated = cabinAlloc.allocatedSeats || 0

      // Get sum of children allocations (allocations where parentAgent = this agent)
      const childrenResult = await AvailabilityAgentAllocation.aggregate([
        {
          $match: {
            company: companyIdObj,
            trip: tripIdObj,
            parentAgent: allocation.agent,
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

      // Find the partner to get the layer name
      const partner = await Partner.findOne({
        _id: allocation.agent,
        company: companyIdObj,
        isDeleted: false,
      })
        .select("layer")
        .lean()

      const level = partner?.layer?.toLowerCase() || "unknown"

      availabilityBreakdown.push({
        level,
        allocated,
        usedByChildren,
        remaining,
      })

      hierarchyRemainings.push(remaining)

      console.log("[v0] Hierarchy level calculation:", {
        level,
        agentId: allocation.agent.toString(),
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
      breakdownLevels: availabilityBreakdown.map((b) => b.level),
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
