const mongoose = require("mongoose")
const Partner = require("../models/Partner")
const AvailabilityAgentAllocation = require("../models/AvailabilityAgentAllocation")

/**
 * Calculate remaining seats based on allocation hierarchy
 * 
 * Hierarchy structure: Company → Marine → Commercial → Agent
 * 
 * Algorithm:
 * For each level in the hierarchy chain (from current partner up to company):
 * - Calculate: remaining = allocatedSeats - usedByChildren
 * - Final available seats = MIN(remaining across all levels)
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

  // For partner users, build complete hierarchy from partner up to company
  try {
    // Get the partner's data to find parent
    const currentPartner = await Partner.findOne({
      _id: new mongoose.Types.ObjectId(partnerId),
      company: new mongoose.Types.ObjectId(companyId),
      isDeleted: false,
    }).lean()

    if (!currentPartner) {
      // Partner not found - return company level only
      return {
        availableSeats: Math.max(0, companyRemaining),
        totalAvailable: Math.max(0, companyRemaining),
        availabilityBreakdown,
        finalAvailableSeats: Math.max(0, companyRemaining),
      }
    }

    // Build list of all parents up the hierarchy
    const parentChain = []
    let currentPartnerId = partnerId
    let iterations = 0
    const maxIterations = 10

    while (currentPartnerId && iterations < maxIterations) {
      const partner = await Partner.findOne({
        _id: new mongoose.Types.ObjectId(currentPartnerId),
        company: new mongoose.Types.ObjectId(companyId),
        isDeleted: false,
      }).lean()

      if (!partner) {
        break
      }

      parentChain.push(partner)

      // Move to parent
      currentPartnerId = partner.parentAccount
      iterations++
    }

    // Reverse to get company first
    parentChain.reverse()

    // Calculate remaining for each level
    for (const parent of parentChain) {
      const allocation = await AvailabilityAgentAllocation.findOne({
        company: new mongoose.Types.ObjectId(companyId),
        trip: new mongoose.Types.ObjectId(tripId),
        agent: parent._id,
        isDeleted: false,
      }).lean()

      if (!allocation) {
        continue
      }

      const categoryAlloc = allocation.allocations?.find(
        (a) => a.type === category
      )

      if (!categoryAlloc) {
        continue
      }

      const cabinAlloc = categoryAlloc.cabins?.find(
        (c) => c.cabin.toString() === cabinId.toString()
      )

      if (!cabinAlloc) {
        continue
      }

      // Get allocated to this level
      const allocated = cabinAlloc.allocatedSeats || 0

      // Get sum of children allocations
      const childrenResult = await AvailabilityAgentAllocation.aggregate([
        {
          $match: {
            company: new mongoose.Types.ObjectId(companyId),
            trip: new mongoose.Types.ObjectId(tripId),
            parentAgent: parent._id,
            isDeleted: false,
          },
        },
        { $unwind: "$allocations" },
        { $match: { "allocations.type": category } },
        { $unwind: "$allocations.cabins" },
        {
          $match: {
            "allocations.cabins.cabin": new mongoose.Types.ObjectId(cabinId),
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

      const level = parent.layer.toLowerCase()
      availabilityBreakdown.push({
        level,
        allocated,
        usedByChildren,
        remaining,
      })

      hierarchyRemainings.push(remaining)

      console.log("[v0] Hierarchy level calculation:", {
        level,
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
      breakdown: availabilityBreakdown,
    })

    return {
      availableSeats: finalAvailableSeats,
      totalAvailable: finalAvailableSeats,
      availabilityBreakdown,
      finalAvailableSeats,
    }
  } catch (error) {
    console.error("[v0] Error calculating hierarchy remaining:", error)
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
