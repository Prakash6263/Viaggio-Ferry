const mongoose = require("mongoose")
const Partner = require("../models/Partner")
const AvailabilityAgentAllocation = require("../models/AvailabilityAgentAllocation")

async function calculateHierarchyRemaining(params) {
  const {
    companyId,
    tripId,
    cabinId,
    category,
    companyRemaining,
    partnerId,
  } = params

  const availabilityBreakdown = [
    {
      level: "company",
      remaining: Math.max(0, companyRemaining),
    },
  ]

  const hierarchyRemainings = [companyRemaining]

  if (!partnerId) {
    return {
      availableSeats: companyRemaining,
      availabilityBreakdown,
      finalAvailableSeats: companyRemaining,
    }
  }

  try {
    const companyIdObj = new mongoose.Types.ObjectId(companyId)
    const tripIdObj = new mongoose.Types.ObjectId(tripId)
    const cabinIdObj = new mongoose.Types.ObjectId(cabinId)
    let currentPartnerId = new mongoose.Types.ObjectId(partnerId)

    // STEP 1: Build partner hierarchy chain
    const partnerChain = []
    let loop = 0

    while (currentPartnerId && loop < 10) {
      partnerChain.push(currentPartnerId)

      const partner = await Partner.findOne({
        _id: currentPartnerId,
        company: companyIdObj,
        isDeleted: false,
      }).select("parentAccount layer")

      if (!partner || !partner.parentAccount) break

      currentPartnerId = partner.parentAccount
      loop++
    }

    // Reverse so order becomes: Marine → Commercial → Selling
    partnerChain.reverse()

    // STEP 2: Get allocations for each partner
    for (const partnerIdLevel of partnerChain) {
      const allocation = await AvailabilityAgentAllocation.findOne({
        company: companyIdObj,
        trip: tripIdObj,
        agent: partnerIdLevel,
        isDeleted: false,
      })
        .populate("agent", "layer")
        .lean()

      if (!allocation) continue

      const layer = allocation.agent.layer.toLowerCase()

      const categoryAlloc = allocation.allocations?.find(
        (a) => a.type === category
      )

      const cabinAlloc = categoryAlloc?.cabins?.find(
        (c) => c.cabin.toString() === cabinIdObj.toString()
      )

      const allocated = cabinAlloc?.allocatedSeats || 0

      // Sum children allocations
      const children = await AvailabilityAgentAllocation.aggregate([
        {
          $match: {
            company: companyIdObj,
            trip: tripIdObj,
            parentAgent: allocation.agent._id,
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

      const usedByChildren = children[0]?.total || 0
      const remaining = Math.max(0, allocated - usedByChildren)

      availabilityBreakdown.push({
        level: layer,
        allocated,
        usedByChildren,
        remaining,
      })

      hierarchyRemainings.push(remaining)
    }

    const finalAvailableSeats = Math.max(
      0,
      Math.min(...hierarchyRemainings)
    )

    return {
      availableSeats: finalAvailableSeats,
      availabilityBreakdown,
      finalAvailableSeats,
    }
  } catch (err) {
    console.log("Hierarchy error:", err)
    return {
      availableSeats: companyRemaining,
      availabilityBreakdown,
      finalAvailableSeats: companyRemaining,
    }
  }
}

module.exports = calculateHierarchyRemaining