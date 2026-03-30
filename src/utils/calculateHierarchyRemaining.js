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

    // STEP 1: Get current agent's allocation
    const currentAllocation = await AvailabilityAgentAllocation.findOne({
      company: companyIdObj,
      trip: tripIdObj,
      agent: partnerIdObj,
      isDeleted: false,
    })
      .populate("agent", "layer")
      .lean()

    // STEP 1B: Determine starting parent from allocation
    let startParentId = currentAllocation?.parentAgent

    // STEP 2: Build chain by walking UP the parentAgent/parentAccount hierarchy
    // Start with current allocation if exists, otherwise start with empty chain
    const chainAllocations = currentAllocation ? [currentAllocation] : []
    let currentParentId = startParentId
    let iterations = 0

    while (currentParentId && iterations < 10) {
      const parentAllocation = await AvailabilityAgentAllocation.findOne({
        company: companyIdObj,
        trip: tripIdObj,
        agent: currentParentId,
        isDeleted: false,
      })
        .populate("agent", "layer")
        .lean()

      if (!parentAllocation) {
        // Try to get parent from Partner.parentAccount instead
        const parentPartner = await Partner.findOne({
          _id: currentParentId,
          company: companyIdObj,
          isDeleted: false,
        }).select("parentAccount layer").lean()
        
        if (parentPartner?.parentAccount) {
          currentParentId = parentPartner.parentAccount
          iterations++
          continue
        } else {
          break
        }
      }

      chainAllocations.push(parentAllocation)

      // Try to get next parent from allocation's parentAgent first
      currentParentId = parentAllocation.parentAgent
      
      // If no parentAgent in allocation, try Partner hierarchy
      if (!currentParentId) {
        const parentPartner = await Partner.findOne({
          _id: parentAllocation.agent._id,
          company: companyIdObj,
          isDeleted: false,
        }).select("parentAccount").lean()
        
        currentParentId = parentPartner?.parentAccount || null
      }
      
      iterations++
    }

    // Reverse to get company-first order
    chainAllocations.reverse()

    // STEP 3: Calculate remaining for each level in the chain
    for (const alloc of chainAllocations) {
      const agentId = alloc.agent._id
      const layer = alloc.agent.layer.toLowerCase()

      const categoryAlloc = alloc.allocations?.find((a) => a.type === category)

      if (!categoryAlloc) {
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
    }

    // STEP 4: Apply MIN formula
    // If no allocations found in chain, return company level only
    if (chainAllocations.length === 0) {
      return {
        availableSeats: Math.max(0, companyRemaining),
        totalAvailable: Math.max(0, companyRemaining),
        availabilityBreakdown,
        finalAvailableSeats: Math.max(0, companyRemaining),
      }
    }

    const finalAvailableSeats = Math.max(0, Math.min(...hierarchyRemainings))

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
