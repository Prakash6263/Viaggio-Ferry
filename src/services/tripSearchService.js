const mongoose = require("mongoose")
const { Trip } = require("../models/Trip")
const { PriceList } = require("../models/PriceList")
const { PriceListDetail } = require("../models/PriceListDetail")
const { TripAvailability } = require("../models/TripAvailability")
const AvailabilityAgentAllocation = require("../models/AvailabilityAgentAllocation")
const { TicketingRule } = require("../models/TicketingRule")
const { PayloadType } = require("../models/PayloadType")
const { Cabin } = require("../models/Cabin")
const { Port } = require("../models/Port")
const { Partner } = require("../models/Partner")

/**
 * Calculate available seats based on allocation hierarchy
 * 
 * CRITICAL RULE:
 * finalAvailableSeats = MIN(
 *   companyRemaining,
 *   marineRemaining,
 *   commercialRemaining,
 *   agentRemaining
 * )
 * 
 * For Company Users:
 *   finalAvailableSeats = companyRemaining (TripAvailability.seats - SUM(all agent allocations))
 * 
 * For Agent Users:
 *   finalAvailableSeats = MIN of all hierarchy levels from company down to agent
 *   Returns availabilityBreakdown array showing each hierarchy level
 */
const calculateAvailableSeats = async (params) => {
  const {
    companyId,
    tripId,
    availabilityId,
    category,
    cabinId,
    userType, // "company" or "partner"
    partnerId, // Required if userType is "partner"
  } = params

  // Get trip availability
  const tripAvailability = await TripAvailability.findOne({
    _id: availabilityId,
    company: companyId,
    trip: tripId,
    isDeleted: false,
  }).lean()

  if (!tripAvailability) {
    return { availableSeats: 0, error: "Trip availability not found" }
  }

  // Find the category availability
  const categoryAvail = tripAvailability.availabilityTypes?.find(
    (at) => at.type === category
  )

  if (!categoryAvail) {
    return { availableSeats: 0, error: "Category availability not found" }
  }

  // Find the cabin within the category
  const cabinAvail = categoryAvail.cabins?.find(
    (c) => c.cabin.toString() === cabinId.toString()
  )

  if (!cabinAvail) {
    return { availableSeats: 0, error: "Cabin availability not found" }
  }

  const totalCapacity = cabinAvail.seats
  const allocatedToAgents = cabinAvail.allocatedSeats || 0

  // Company remaining = total capacity - allocated to agents
  const companyRemaining = totalCapacity - allocatedToAgents

  // Build availability breakdown starting with company level
  const availabilityBreakdown = [
    {
      level: "company",
      remaining: Math.max(0, companyRemaining),
    },
  ]

  // If user is company, return company remaining directly
  if (userType === "company") {
    return {
      availableSeats: Math.max(0, companyRemaining),
      finalAvailableSeats: Math.max(0, companyRemaining),
      totalCapacity,
      availabilityBreakdown,
    }
  }

  // For agent users, calculate based on allocation hierarchy
  if (userType === "partner" && partnerId) {
    // Get the agent's allocation with parent chain
    const agentAllocation = await AvailabilityAgentAllocation.findOne({
      company: companyId,
      trip: tripId,
      agent: partnerId,
      isDeleted: false,
    })
      .populate("agent", "name agentType")
      .lean()

    if (!agentAllocation) {
      // Agent has no allocation for this trip
      return { availableSeats: 0, error: "No allocation found for agent" }
    }

    // Find allocation for this category and cabin
    const categoryAlloc = agentAllocation.allocations?.find(
      (a) => a.type === category
    )

    if (!categoryAlloc) {
      return { availableSeats: 0, error: "No category allocation for agent" }
    }

    const cabinAlloc = categoryAlloc.cabins?.find(
      (c) => c.cabin.toString() === cabinId.toString()
    )

    if (!cabinAlloc) {
      return { availableSeats: 0, error: "No cabin allocation for agent" }
    }

    const agentAllocated = cabinAlloc.allocatedSeats || 0

    // Get sum of child allocations (sub-agents allocated by this agent)
    // agentRemaining = agentAllocated - SUM(childAllocations.quantity)
    const childAllocations = await AvailabilityAgentAllocation.aggregate([
      {
        $match: {
          company: new mongoose.Types.ObjectId(companyId),
          trip: new mongoose.Types.ObjectId(tripId),
          parentAgent: new mongoose.Types.ObjectId(partnerId),
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

    const totalChildAllocated = childAllocations[0]?.totalChildAllocated || 0
    const agentRemaining = Math.max(0, agentAllocated - totalChildAllocated)

    // Determine agent level based on hierarchy (Marine → Commercial → Agent)
    let agentLevel = "agent"
    if (agentAllocation.agent?.agentType) {
      const agentType = agentAllocation.agent.agentType.toLowerCase()
      if (agentType.includes("marine")) {
        agentLevel = "marine"
      } else if (agentType.includes("commercial")) {
        agentLevel = "commercial"
      }
    } else if (!agentAllocation.parentAgent) {
      // Top-level agent with no parent
      agentLevel = "marine"
    }

    // Collect all remaining values for MIN calculation
    const hierarchyRemainings = [companyRemaining]

    // If agent has a parent, recursively get parent hierarchy
    if (agentAllocation.parentAgent) {
      const parentResult = await calculateAvailableSeats({
        companyId,
        tripId,
        availabilityId,
        category,
        cabinId,
        userType: "partner",
        partnerId: agentAllocation.parentAgent,
      })

      // Extract parent breakdown and insert between company and current agent
      if (parentResult.availabilityBreakdown && parentResult.availabilityBreakdown.length > 1) {
        // Insert parent levels (skip company level which is already added)
        const parentBreakdown = parentResult.availabilityBreakdown.slice(1) // Skip company
        parentBreakdown.forEach((item) => {
          // Insert before the current position to maintain hierarchy order
          availabilityBreakdown.push(item)
          // Collect remaining for MIN calculation
          hierarchyRemainings.push(item.remaining)
        })
      }
    }

    // Add current agent to breakdown
    availabilityBreakdown.push({
      level: agentLevel,
      remaining: Math.max(0, agentRemaining),
    })
    
    // Add agent remaining to hierarchy remainings for MIN calculation
    hierarchyRemainings.push(agentRemaining)

    // Apply MIN formula: MIN(company, marine, commercial, agent)
    const finalAvailableSeats = Math.max(
      0,
      Math.min(...hierarchyRemainings)
    )

    return {
      availableSeats: finalAvailableSeats,
      finalAvailableSeats,
      totalCapacity,
      availabilityBreakdown,
    }
  }

  return { availableSeats: 0, error: "Invalid user type" }
}

/**
 * Find best matching price based on priority order:
 * 1. Route + Partner + PayloadType/Cabin + PassengerType + VisaType (partner-specific price)
 * 2. Route + PayloadType/Cabin + PassengerType + VisaType (default price)
 * 
 * Each level sorted by effectiveDateTime descending
 * Uses PriceListDetail lookup with route (originPort + destinationPort) + cabin + passengerType + visaType + partner + effectiveDate
 */
const findBestPrice = async (params) => {
  const {
    companyId,
    tripId,
    category,
    ticketType,
    originPort,
    destinationPort,
    cabinId,
    passengerTypeId,
    visaType,
    partnerId,
    departureDate,
  } = params

  const basePriceQuery = {
    originPort: new mongoose.Types.ObjectId(originPort),
    destinationPort: new mongoose.Types.ObjectId(destinationPort),
    ticketType,
    cabin: new mongoose.Types.ObjectId(cabinId),
    passengerType: new mongoose.Types.ObjectId(passengerTypeId),
    isDeleted: false,
    isDisabled: false,
  }

  if (visaType) {
    basePriceQuery.visaType = visaType
  }

  const basePriceListQuery = {
    company: new mongoose.Types.ObjectId(companyId),
    category,
    status: "active",
    isDeleted: false,
    effectiveDateTime: { $lte: new Date(departureDate) },
  }

  // Helper to find price with specific conditions
  const findPrice = async (extraPriceListQuery = {}) => {
    const priceDetails = await PriceListDetail.find(basePriceQuery)
      .populate({
        path: "priceList",
        match: { ...basePriceListQuery, ...extraPriceListQuery },
        populate: {
          path: "currency",
          select: "currencyCode currencyName currentRate",
        },
      })
      .populate("passengerType", "name code category ageRange")
      .populate("cabin", "name cabinCode")
      .populate("taxIds", "code name value type form")
      .sort({ "priceList.effectiveDateTime": -1 })
      .lean()

    // Filter where priceList matched
    const validPrices = priceDetails.filter((pd) => pd.priceList !== null)
    
    // Sort by effectiveDateTime descending and return the first (most recent)
    if (validPrices.length > 0) {
      validPrices.sort(
        (a, b) =>
          new Date(b.priceList.effectiveDateTime) -
          new Date(a.priceList.effectiveDateTime)
      )
      return validPrices[0]
    }
    return null
  }

  // Priority 1: Partner-specific price (if partnerId provided)
  // Look for a price list that includes this partner in the partners array
  if (partnerId) {
    const partnerPrice = await findPrice({
      partners: new mongoose.Types.ObjectId(partnerId),
    })
    if (partnerPrice) {
      return { price: partnerPrice, priorityLevel: 1, priceType: "partner" }
    }
  }

  // Priority 2: Route default price (no partner filter)
  const defaultPrice = await findPrice({})
  if (defaultPrice) {
    return { price: defaultPrice, priorityLevel: 2, priceType: "default" }
  }

  return null
}

/**
 * Search trips with matching price list details
 * 
 * @param {Object} params - Search parameters
 * @param {String} params.companyId - Company ID (required)
 * @param {String} params.userType - "company" or "partner"
 * @param {String} params.partnerId - Partner ID if userType is partner
 * @param {String} params.category - passenger, vehicle, or cargo (required)
 * @param {String} params.tripType - one_way or return (required)
 * @param {String} params.originPort - Origin port ID (required)
 * @param {String} params.destinationPort - Destination port ID (required)
 * @param {Date} params.departureDate - Departure date (required)
 * @param {String} params.cabin - Cabin ID (optional)
 * @param {String} params.visaType - Visa type (optional)
 * @param {Array} params.passengers - Array of passenger objects with payloadTypeId and quantity
 * @returns {Object} - Search results with trips and pricing
 */
const searchTripsWithPricing = async (params) => {
  const {
    companyId,
    userType = "company",
    partnerId,
    category,
    tripType,
    originPort,
    destinationPort,
    departureDate,
    cabin,
    visaType,
    passengers = [],
  } = params

  // ===== VALIDATION =====
  if (!companyId) throw new Error("Company ID is required")
  if (!category) throw new Error("Category is required")
  if (!tripType) throw new Error("Trip type is required")
  if (!originPort) throw new Error("Origin port is required")
  if (!destinationPort) throw new Error("Destination port is required")
  if (!departureDate) throw new Error("Departure date is required")
  if (!passengers || passengers.length === 0) {
    throw new Error("At least one passenger with payloadTypeId and quantity is required")
  }

  // Validate passengers array structure
  for (const passenger of passengers) {
    if (!passenger.payloadTypeId) {
      throw new Error("Each passenger must have a payloadTypeId")
    }
    if (passenger.quantity === undefined || passenger.quantity === null || passenger.quantity < 0) {
      throw new Error("Each passenger must have a quantity of 0 or more")
    }
  }

  // Ensure at least one passenger has quantity > 0
  const totalQuantity = passengers.reduce((sum, p) => sum + p.quantity, 0)
  if (totalQuantity < 1) {
    throw new Error("At least one passenger with quantity > 0 is required")
  }

  // Validate category
  const validCategories = ["passenger", "vehicle", "cargo"]
  const normalizedCategory = category.toLowerCase()
  if (!validCategories.includes(normalizedCategory)) {
    throw new Error(`Invalid category. Must be one of: ${validCategories.join(", ")}`)
  }

  // Convert tripType to match price list detail format
  let priceListTripType = tripType.toLowerCase()
  if (priceListTripType === "one-way") {
    priceListTripType = "one_way"
  } else if (priceListTripType === "round-trip" || priceListTripType === "round_trip") {
    priceListTripType = "round_trip"
  }

  // ===== FIND TRIPS =====
  // Parse departure date - search for trips on that day
  const searchDate = new Date(departureDate)
  const startOfDay = new Date(searchDate)
  startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date(searchDate)
  endOfDay.setHours(23, 59, 59, 999)

  // Build trip query - Match originPort to departurePort, destinationPort to arrivalPort
  const tripQuery = {
    company: new mongoose.Types.ObjectId(companyId),
    departurePort: new mongoose.Types.ObjectId(originPort),
    arrivalPort: new mongoose.Types.ObjectId(destinationPort),
    departureDateTime: {
      $gte: startOfDay,
      $lte: endOfDay,
    },
    status: "SCHEDULED",
    isDeleted: false,
  }

  const trips = await Trip.find(tripQuery)
    .populate("ship", "name imoNumber")
    .populate("departurePort", "name code country")
    .populate("arrivalPort", "name code country")
    .sort({ departureDateTime: 1 })
    .lean()

  if (trips.length === 0) {
    return {
      success: true,
      message: "No trips found matching the search criteria",
      data: {
        searchParams: {
          category: normalizedCategory,
          tripType,
          originPort,
          destinationPort,
          departureDate,
          cabin,
          visaType,
          passengers,
          totalPassengers: totalQuantity,
        },
        trips: [],
      },
    }
  }

  // ===== GET PAYLOAD TYPES =====
  const passengerTypeIds = passengers.map((p) => new mongoose.Types.ObjectId(p.payloadTypeId))
  
  const payloadTypes = await PayloadType.find({
    _id: { $in: passengerTypeIds },
    company: new mongoose.Types.ObjectId(companyId),
    category: normalizedCategory,
    status: "Active",
    isDeleted: false,
  }).lean()

  if (payloadTypes.length !== passengerTypeIds.length) {
    const foundIds = payloadTypes.map((pt) => pt._id.toString())
    const missingIds = passengers
      .filter((p) => !foundIds.includes(p.payloadTypeId))
      .map((p) => p.payloadTypeId)
    throw new Error(`Invalid or inactive payload types: ${missingIds.join(", ")}`)
  }

  // ===== BUILD RESULTS =====
  const results = []

  for (const trip of trips) {
    // Get trip availability
    const tripAvailability = await TripAvailability.findOne({
      company: new mongoose.Types.ObjectId(companyId),
      trip: trip._id,
      isDeleted: false,
    })
      .populate("availabilityTypes.cabins.cabin", "name cabinCode")
      .lean()

    // Get all cabins for this category from trip or availability
    let availableCabins = []
    
    // From trip capacity details
    if (trip.tripCapacityDetails && trip.tripCapacityDetails[normalizedCategory]) {
      availableCabins = trip.tripCapacityDetails[normalizedCategory].map((c) => ({
        cabinId: c.cabinId,
        cabinName: c.cabinName,
        totalSeats: c.totalSeat,
        remainingSeats: c.remainingSeat,
      }))
    }

    // If cabin filter is provided, filter cabins
    if (cabin) {
      availableCabins = availableCabins.filter(
        (c) => c.cabinId.toString() === cabin
      )
    }

    // Build cabin options with pricing and availability
    const cabinOptions = []

    for (const cabinInfo of availableCabins) {
      const cabinId = cabinInfo.cabinId

      // ===== CALCULATE AVAILABILITY BASED ON ALLOCATION HIERARCHY =====
      let availabilityResult = { availableSeats: cabinInfo.remainingSeats }
      
      if (tripAvailability) {
        availabilityResult = await calculateAvailableSeats({
          companyId,
          tripId: trip._id,
          availabilityId: tripAvailability._id,
          category: normalizedCategory,
          cabinId,
          userType,
          partnerId,
        })
      }

      // ===== GET PRICING FOR EACH PASSENGER TYPE =====
      const pricingBreakdown = []
      let totalBasicPrice = 0
      let totalTaxes = 0
      let totalPrice = 0
      let hasMissingPrice = false
      let currency = null
      let priceListId = null

      for (const passenger of passengers) {
        const payloadType = payloadTypes.find(
          (pt) => pt._id.toString() === passenger.payloadTypeId
        )

        // Find best price for this passenger type
        const priceResult = await findBestPrice({
          companyId,
          tripId: trip._id,
          category: normalizedCategory,
          ticketType: priceListTripType,
          originPort,
          destinationPort,
          cabinId,
          passengerTypeId: passenger.payloadTypeId,
          visaType,
          partnerId,
          departureDate,
        })

        if (priceResult && priceResult.price) {
          const price = priceResult.price
          // PRICING FORMULA per requirements:
          // unitTotalPrice = basicPrice + taxes
          // subtotal = unitTotalPrice * quantity
          // totalPrice = sum(all subtotals)
          const unitTotalPrice = price.totalPrice // includes base + tax
          const subtotal = unitTotalPrice * passenger.quantity
          
          // Calculate tax portion for this passenger type
          const taxAmount = (price.totalPrice - price.basicPrice) * passenger.quantity
          
          totalBasicPrice += price.basicPrice * passenger.quantity
          totalTaxes += taxAmount
          totalPrice += subtotal
          
          currency = price.priceList?.currency
          priceListId = price.priceList?._id

          pricingBreakdown.push({
            payloadType: {
              _id: payloadType._id,
              name: payloadType.name,
              code: payloadType.code,
              ageRange: payloadType.ageRange,
            },
            quantity: passenger.quantity,
            unitPrice: price.basicPrice,
            unitTotalPrice: unitTotalPrice,
            subtotal: Math.round(subtotal * 100) / 100,
            taxes: price.taxIds || [],
            allowedLuggagePieces: price.allowedLuggagePieces,
            allowedLuggageWeight: price.allowedLuggageWeight,
            excessLuggagePricePerKg: price.excessLuggagePricePerKg,
            priceType: priceResult.priceType,
          })
        } else {
          // No price found
          if (passenger.quantity > 0) {
            hasMissingPrice = true
          }
          pricingBreakdown.push({
            payloadType: {
              _id: payloadType._id,
              name: payloadType.name,
              code: payloadType.code,
              ageRange: payloadType.ageRange,
            },
            quantity: passenger.quantity,
            unitPrice: null,
            unitTotalPrice: null,
            subtotal: passenger.quantity === 0 ? 0 : null,
            taxes: [],
            ...(passenger.quantity > 0
              ? { error: "No price found for this passenger type" }
              : {}),
          })
        }
      }

      // Fetch cabin details if not populated
      let cabinDetails = { _id: cabinId, name: cabinInfo.cabinName }
      if (!cabinInfo.cabinName) {
        const cabinDoc = await Cabin.findById(cabinId).select("name cabinCode").lean()
        if (cabinDoc) {
          cabinDetails = cabinDoc
        }
      }

      // Determine if booking is allowed for this cabin
      const now = new Date()
      const availableSeatsValue = availabilityResult.finalAvailableSeats ?? availabilityResult.availableSeats ?? 0
      
      // Booking allowed when:
      // 1. finalAvailableSeats > 0
      // 2. currentDate < bookingClosingDate
      // 3. currentDate < departureDateTime
      // 4. trip.status === "SCHEDULED"
      const bookingAllowed = 
        availableSeatsValue > 0 &&
        !hasMissingPrice &&
        (!trip.bookingClosingDate || now < trip.bookingClosingDate) &&
        (!trip.departureDateTime || now < trip.departureDateTime) &&
        trip.status === "SCHEDULED"

      // Calculate totalPrice as sum of all breakdown subtotals (including taxes)
      const calculatedTotalPrice = pricingBreakdown.reduce((sum, item) => {
        if (item.subtotal !== null && item.subtotal !== undefined) {
          return sum + item.subtotal
        }
        return sum
      }, 0)

      cabinOptions.push({
        cabin: cabinDetails,
        availability: {
          totalSeats: availabilityResult.totalCapacity || cabinInfo.totalSeats,
          availableSeats: Math.max(0, availabilityResult.availableSeats || 0),
          finalAvailableSeats: Math.max(0, availableSeatsValue),
          availabilityBreakdown: (availabilityResult.availabilityBreakdown || []).map(item => ({
            level: item.level,
            remaining: item.remaining
          })),
        },
        bookingAllowed,
        pricing: {
          breakdown: pricingBreakdown,
          totalBasicPrice: Math.round(totalBasicPrice * 100) / 100,
          totalTaxes: Math.round(totalTaxes * 100) / 100,
          totalPrice: Math.round(calculatedTotalPrice * 100) / 100,
          currency,
          priceListId,
          hasMissingPrice,
        },
      })
    }

    // ===== GET TICKETING RULES FROM EMBEDDED Trip.ticketingRules =====
    const ticketingRules = {}
    
    if (trip.ticketingRules && trip.ticketingRules.length > 0) {
      // Need to populate the embedded rules
      const tripWithRules = await Trip.findById(trip._id)
        .populate({
          path: "ticketingRules.rule",
          select: "ruleName ruleType restrictedWindowHours normalFee restrictedPenalty noShowPenalty conditions",
        })
        .lean()

      if (tripWithRules?.ticketingRules) {
        for (const tr of tripWithRules.ticketingRules) {
          if (tr.rule) {
            ticketingRules[tr.ruleType] = {
              ruleName: tr.rule.ruleName,
              restrictedWindowHours: tr.rule.restrictedWindowHours,
              normalFee: tr.rule.normalFee,
              restrictedPenalty: tr.rule.restrictedPenalty,
              noShowPenalty: tr.rule.noShowPenalty,
              conditions: tr.rule.conditions,
            }
          }
        }
      }
    }

    // Only include trips that have at least one cabin option
    if (cabinOptions.length > 0) {
      // Calculate trip status flags
      const now = new Date()
      const tripStatusFlags = {
        bookingOpen: 
          (!trip.bookingOpeningDate || now >= trip.bookingOpeningDate) &&
          (!trip.bookingClosingDate || now <= trip.bookingClosingDate),
        checkInOpen:
          (!trip.checkInOpeningDate || now >= trip.checkInOpeningDate) &&
          (!trip.checkInClosingDate || now <= trip.checkInClosingDate),
        boardingClosed:
          trip.checkInClosingDate ? now > trip.checkInClosingDate : false,
        departed:
          trip.departureDateTime ? now > trip.departureDateTime : false,
      }

      results.push({
        trip: {
          _id: trip._id,
          tripName: trip.tripName,
          tripCode: trip.tripCode,
          ship: trip.ship,
          departurePort: trip.departurePort,
          arrivalPort: trip.arrivalPort,
          departureDateTime: trip.departureDateTime,
          arrivalDateTime: trip.arrivalDateTime,
          status: trip.status,
          bookingOpeningDate: trip.bookingOpeningDate,
          bookingClosingDate: trip.bookingClosingDate,
          checkInOpeningDate: trip.checkInOpeningDate,
          checkInClosingDate: trip.checkInClosingDate,
          tripStatusFlags,
        },
        ticketingRules,
        cabinOptions,
        passengers: passengers.map((p) => {
          const pt = payloadTypes.find((pt) => pt._id.toString() === p.payloadTypeId)
          return {
            payloadType: {
              _id: pt._id,
              name: pt.name,
              code: pt.code,
              ageRange: pt.ageRange,
            },
            quantity: p.quantity,
          }
        }),
        totalPassengers: totalQuantity,
      })
    }
  }

  return {
    success: true,
    message: `Found ${results.length} trip(s) matching your search criteria`,
    data: {
      searchParams: {
        category: normalizedCategory,
        tripType,
        originPort,
        destinationPort,
        departureDate,
        cabin,
        visaType,
        passengers,
        totalPassengers: totalQuantity,
      },
      trips: results,
    },
  }
}

module.exports = {
  searchTripsWithPricing,
  calculateAvailableSeats,
  findBestPrice,
}
