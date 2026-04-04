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
const Partner = require("../models/Partner")
const calculateHierarchyRemaining = require("../utils/calculateHierarchyRemaining")

/**
 * Helper function to search trips for a single direction
 * Used for both one-way and return (for outbound/inbound) searches
 */
const searchTripsForDirection = async (params) => {
  const {
    companyId,
    userType,
    partnerId,
    category,
    priceListTripType,
    departPort,
    arrivePort,
    searchDate,
    searchWindowDays = 5, // Default to ±5 days, can be overridden
    cabin,
    visaType,
    passengers,
    payloadTypes,
    totalQuantity,
  } = params

  // Parse search date - search for trips within searchWindowDays before and after
  const searchStartDate = new Date(searchDate)
  searchStartDate.setDate(searchStartDate.getDate() - searchWindowDays)
  searchStartDate.setHours(0, 0, 0, 0)

  const searchEndDate = new Date(searchDate)
  searchEndDate.setDate(searchEndDate.getDate() + searchWindowDays)
  searchEndDate.setHours(23, 59, 59, 999)

  // Build trip query
  const tripQuery = {
    company: new mongoose.Types.ObjectId(companyId),
    departurePort: new mongoose.Types.ObjectId(departPort),
    arrivalPort: new mongoose.Types.ObjectId(arrivePort),
    departureDateTime: {
      $gte: searchStartDate,
      $lte: searchEndDate,
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
    return { trips: [], dateRange: { from: searchStartDate, to: searchEndDate } }
  }

  // Build results for each trip
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
    if (trip.tripCapacityDetails && trip.tripCapacityDetails[category]) {
      availableCabins = trip.tripCapacityDetails[category].map((c) => ({
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

      // Calculate availability based on allocation hierarchy
      let availabilityResult = { availableSeats: cabinInfo.remainingSeats }

      if (tripAvailability) {
        availabilityResult = await calculateAvailableSeats({
          companyId,
          tripId: trip._id,
          availabilityId: tripAvailability._id,
          category,
          cabinId,
          userType,
          partnerId,
        })
      }

      // Get pricing for each passenger type
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
          category,
          ticketType: priceListTripType,
          originPort: departPort,
          destinationPort: arrivePort,
          cabinId,
          passengerTypeId: passenger.payloadTypeId,
          visaType,
          partnerId,
          departureDate: searchDate,
        })

        if (priceResult && priceResult.price) {
          const price = priceResult.price
          const unitTotalPrice = price.totalPrice // includes base + tax
          const subtotal = unitTotalPrice * passenger.quantity

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

      // Determine if booking is allowed
      const now = new Date()
      const availableSeatsValue = availabilityResult.finalAvailableSeats ?? availabilityResult.availableSeats ?? 0

      const bookingAllowed =
        availableSeatsValue > 0 &&
        !hasMissingPrice &&
        (!trip.bookingClosingDate || now < trip.bookingClosingDate) &&
        (!trip.departureDateTime || now < trip.departureDateTime) &&
        trip.status === "SCHEDULED"

      // Calculate total price
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

    // Get ticketing rules
    const ticketingRules = {}

    if (trip.ticketingRules && trip.ticketingRules.length > 0) {
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
    trips: results,
    dateRange: { from: searchStartDate, to: searchEndDate }
  }
}

/**
 * Calculate available seats based on allocation hierarchy
 * 
 * CRITICAL RULE:
 * finalAvailableSeats = SUM(
 *   companyRemaining,
 *   marineRemaining,
 *   commercialRemaining,
 *   agentRemaining
 * )
 * 
 * For Company Users:
 *   availableSeats = companyRemaining (TripAvailability.seats - SUM(all agent allocations))
 *   finalAvailableSeats = companyRemaining
 * 
 * For Partner Users:
 *   finalAvailableSeats = SUM of remaining seats from all hierarchy levels from company down to partner
 *   availableSeats = companyRemaining (company level remaining)
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

  // Use the proper hierarchy calculation utility
  const hierarchyResult = await calculateHierarchyRemaining({
    companyId,
    tripId,
    cabinId,
    category,
    companyRemaining,
    partnerId: userType === "partner" ? partnerId : null,
  })

  return {
    availableSeats: hierarchyResult.availableSeats,
    finalAvailableSeats: hierarchyResult.finalAvailableSeats,
    totalCapacity,
    availabilityBreakdown: hierarchyResult.availabilityBreakdown,
  }
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
 * Search for trips with pricing details
 * 
 * @param {String} params.companyId - Company ID (required)
 * @param {String} params.userType - "company" or "partner"
 * @param {String} params.partnerId - Partner ID if userType is partner
 * @param {String} params.category - passenger, vehicle, or cargo (required)
 * @param {String} params.tripType - one_way or return (required)
 * @param {String} params.originPort - Origin port ID (required)
 * @param {String} params.destinationPort - Destination port ID (required)
 * @param {Date} params.departureDate - Departure date (required)
 * @param {Date} params.returnDate - Return date (required for return trips)
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
    returnDate,
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
  if (tripType.toLowerCase() === "return" && !returnDate) {
    throw new Error("Return date is required for return trips")
  }
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
  // For return trips, use "one_way" price for both outbound and inbound legs
  let priceListTripType = tripType.toLowerCase()

  if (priceListTripType === "one-way") {
    priceListTripType = "one_way"
  } else if (priceListTripType === "round-trip" || priceListTripType === "round_trip") {
    priceListTripType = "round_trip"
  } else if (priceListTripType === "return") {
    // Return trips use one_way pricing for each leg
    priceListTripType = "one_way"
  }

  // Normalize trip type
  const normalizedTripType = tripType.toLowerCase() === "return" ? "return" : "one_way"

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

  // ===== PERFORM SEARCH BASED ON TRIP TYPE =====
  let searchResults = {}
  let allTrips = []

  if (normalizedTripType === "return") {
    // Return Trip = One Way Trip (Outbound) + One Way Trip (Inbound)
    // Search for both outbound and inbound trips using one_way pricing

    // Outbound: originPort -> destinationPort on departureDate
    const outboundResult = await searchTripsForDirection({
      companyId,
      userType,
      partnerId,
      category: normalizedCategory,
      priceListTripType: "one_way", // Use one_way for outbound leg
      departPort: originPort,
      arrivePort: destinationPort,
      searchDate: departureDate,
      cabin,
      visaType,
      passengers,
      payloadTypes,
      totalQuantity,
    })

    // Inbound: destinationPort -> originPort on returnDate
    const inboundResult = await searchTripsForDirection({
      companyId,
      userType,
      partnerId,
      category: normalizedCategory,
      priceListTripType: "one_way", // Use one_way for inbound leg
      departPort: destinationPort,
      arrivePort: originPort,
      searchDate: returnDate,
      cabin,
      visaType,
      passengers,
      payloadTypes,
      totalQuantity,
    })

    // Debug: Log search results
    console.log("[v0] Outbound trips found:", outboundResult.trips.length)
    outboundResult.trips.forEach((t, i) => {
      console.log(`[v0]   Outbound ${i}: ${t.trip.tripCode}, cabinOptions: ${t.cabinOptions.length}`)
      t.cabinOptions.forEach((c, j) => {
        console.log(`[v0]     Cabin ${j}: ${c.cabin.name}, seats: ${c.availability.finalAvailableSeats}`)
      })
    })

    console.log("[v0] Inbound trips found:", inboundResult.trips.length)
    inboundResult.trips.forEach((t, i) => {
      console.log(`[v0]   Inbound ${i}: ${t.trip.tripCode}, cabinOptions: ${t.cabinOptions.length}`)
      t.cabinOptions.forEach((c, j) => {
        console.log(`[v0]     Cabin ${j}: ${c.cabin.name}, seats: ${c.availability.finalAvailableSeats}`)
      })
    })

    // Combine outbound and inbound trips
    // Each return option = outbound trip + inbound trip
    const combinedReturnTrips = []

    for (const outboundTrip of outboundResult.trips) {
      // For each outbound trip, find matching inbound trips with same cabin
      for (const outboundCabin of outboundTrip.cabinOptions) {
        for (const inboundTrip of inboundResult.trips) {
          // Find matching cabin in inbound trip
          const matchingInboundCabin = inboundTrip.cabinOptions.find(
            c => c.cabin._id.toString() === outboundCabin.cabin._id.toString()
          )

          // Skip if cabin doesn't exist in inbound trip
          if (!matchingInboundCabin) {
            console.log(`[v0] Skipping combination: cabin ${outboundCabin.cabin.name} not found in inbound trip ${inboundTrip.trip.tripCode}`)
            continue
          }

          // Check if both cabins have pricing
          if (!outboundCabin.pricing || !matchingInboundCabin.pricing) {
            console.log(`[v0] Skipping combination: missing pricing for cabin ${outboundCabin.cabin.name}`)
            continue
          }

          // Combine pricing: total price = outbound price + inbound price
          const combinedPricingBreakdown = []
          let combinedTotalBasicPrice = 0
          let combinedTotalTaxes = 0
          let combinedTotalPrice = 0
          let hasMissingPrice = false
          let currency = null

          // Combine pricing for each passenger type
          for (let i = 0; i < outboundCabin.pricing.breakdown.length; i++) {
            const outboundPricing = outboundCabin.pricing.breakdown[i]
            const inboundPricing = matchingInboundCabin.pricing.breakdown[i]

            // Check if both have prices
            if (!outboundPricing.unitTotalPrice || !inboundPricing.unitTotalPrice) {
              hasMissingPrice = true
            }

            const outboundSubtotal = outboundPricing.subtotal || 0
            const inboundSubtotal = inboundPricing.subtotal || 0
            const combinedSubtotal = outboundSubtotal + inboundSubtotal

            combinedTotalBasicPrice += (outboundPricing.unitPrice || 0) * outboundPricing.quantity
            combinedTotalBasicPrice += (inboundPricing.unitPrice || 0) * inboundPricing.quantity

            const outboundTaxes = (outboundPricing.subtotal || 0) - ((outboundPricing.unitPrice || 0) * outboundPricing.quantity)
            const inboundTaxes = (inboundPricing.subtotal || 0) - ((inboundPricing.unitPrice || 0) * inboundPricing.quantity)

            combinedTotalTaxes += outboundTaxes + inboundTaxes
            combinedTotalPrice += combinedSubtotal

            currency = outboundPricing.unitTotalPrice ? outboundCabin.pricing.currency : matchingInboundCabin.pricing.currency

            combinedPricingBreakdown.push({
              payloadType: outboundPricing.payloadType,
              quantity: outboundPricing.quantity,

              outboundPrice: {
                unitPrice: outboundPricing.unitPrice,
                unitTotalPrice: outboundPricing.unitTotalPrice,
                subtotal: outboundSubtotal,
                allowedLuggagePieces: outboundPricing.allowedLuggagePieces,
                allowedLuggageWeight: outboundPricing.allowedLuggageWeight,
                excessLuggagePricePerKg: outboundPricing.excessLuggagePricePerKg,
              },

              inboundPrice: {
                unitPrice: inboundPricing.unitPrice,
                unitTotalPrice: inboundPricing.unitTotalPrice,
                subtotal: inboundSubtotal,
                allowedLuggagePieces: inboundPricing.allowedLuggagePieces,
                allowedLuggageWeight: inboundPricing.allowedLuggageWeight,
                excessLuggagePricePerKg: inboundPricing.excessLuggagePricePerKg,
              },

              returnTotalPrice: combinedSubtotal,
              taxes: [...(outboundPricing.taxes || []), ...(inboundPricing.taxes || [])],
            })
          }

          // Available seats = min(outbound seats, inbound seats)
          // Note: Don't filter out if seats = 0, just set bookingAllowed = false
          const outboundAvailableSeats = outboundCabin.availability.finalAvailableSeats
          const inboundAvailableSeats = matchingInboundCabin.availability.finalAvailableSeats
          const combinedAvailableSeats = Math.min(outboundAvailableSeats, inboundAvailableSeats)

          // Booking allowed only if both trips allow booking and there are available seats
          const outboundBookingAllowed = outboundCabin.bookingAllowed
          const inboundBookingAllowed = matchingInboundCabin.bookingAllowed
          const combinedBookingAllowed = outboundBookingAllowed && inboundBookingAllowed && !hasMissingPrice && combinedAvailableSeats > 0

          combinedReturnTrips.push({
            returnTrip: {
              outbound: {
                _id: outboundTrip.trip._id,
                tripName: outboundTrip.trip.tripName,
                tripCode: outboundTrip.trip.tripCode,
                ship: outboundTrip.trip.ship,
                departurePort: outboundTrip.trip.departurePort,
                arrivalPort: outboundTrip.trip.arrivalPort,
                departureDateTime: outboundTrip.trip.departureDateTime,
                arrivalDateTime: outboundTrip.trip.arrivalDateTime,
                status: outboundTrip.trip.status,

                bookingOpeningDate: outboundTrip.trip.bookingOpeningDate,
                bookingClosingDate: outboundTrip.trip.bookingClosingDate,
                checkInOpeningDate: outboundTrip.trip.checkInOpeningDate,
                checkInClosingDate: outboundTrip.trip.checkInClosingDate,

                tripStatusFlags: outboundTrip.trip.tripStatusFlags,
              },
              inbound: {
                _id: inboundTrip.trip._id,
                tripName: inboundTrip.trip.tripName,
                tripCode: inboundTrip.trip.tripCode,
                ship: inboundTrip.trip.ship,
                departurePort: inboundTrip.trip.departurePort,
                arrivalPort: inboundTrip.trip.arrivalPort,
                departureDateTime: inboundTrip.trip.departureDateTime,
                arrivalDateTime: inboundTrip.trip.arrivalDateTime,
                status: inboundTrip.trip.status,

                bookingOpeningDate: inboundTrip.trip.bookingOpeningDate,
                bookingClosingDate: inboundTrip.trip.bookingClosingDate,
                checkInOpeningDate: inboundTrip.trip.checkInOpeningDate,
                checkInClosingDate: inboundTrip.trip.checkInClosingDate,

                tripStatusFlags: inboundTrip.trip.tripStatusFlags,
              },
            },
             ticketingRules: {
    outbound: outboundTrip.ticketingRules,
    inbound: inboundTrip.ticketingRules
  },
            cabin: outboundCabin.cabin,
            availability: {
              outboundSeats: outboundAvailableSeats,
              inboundSeats: inboundAvailableSeats,
              combinedAvailableSeats: combinedAvailableSeats,
              totalSeats: Math.min(
                outboundCabin.availability.totalSeats,
                matchingInboundCabin.availability.totalSeats
              ),
            },
            bookingAllowed: combinedBookingAllowed,
            pricing: {
              breakdown: combinedPricingBreakdown,
              outboundTotal: outboundCabin.pricing.totalPrice,
              inboundTotal: matchingInboundCabin.pricing.totalPrice,
              returnTotalPrice: Math.round(combinedTotalPrice * 100) / 100, // outbound + inbound
              totalBasicPrice: Math.round(combinedTotalBasicPrice * 100) / 100,
              totalTaxes: Math.round(combinedTotalTaxes * 100) / 100,
              currency: currency || outboundCabin.pricing.currency,
              hasMissingPrice,
            },
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
    }

    console.log("[v0] Combined return trip combinations:", combinedReturnTrips.length)

    const successMessage = combinedReturnTrips.length === 0
      ? "No return trip combinations found matching your search criteria"
      : `Found ${outboundResult.trips.length} outbound trip(s) and ${inboundResult.trips.length} inbound trip(s) = ${combinedReturnTrips.length} return combination(s)`

    return {
      success: true,
      message: successMessage,
      data: {
        searchParams: {
          category: normalizedCategory,
          tripType,
          originPort,
          destinationPort,
          departureDate,
          returnDate,
          outboundDateRange: {
            from: outboundResult.dateRange.from.toISOString().split('T')[0],
            to: outboundResult.dateRange.to.toISOString().split('T')[0],
            daysBeforeAfter: 5,
          },
          inboundDateRange: {
            from: inboundResult.dateRange.from.toISOString().split('T')[0],
            to: inboundResult.dateRange.to.toISOString().split('T')[0],
            daysBeforeAfter: 5,
          },
          cabin,
          visaType,
          passengers,
          totalPassengers: totalQuantity,
        },
        trips: combinedReturnTrips,
      },
    }
  } else {
    // One-way search
    const oneWayResult = await searchTripsForDirection({
      companyId,
      userType,
      partnerId,
      category: normalizedCategory,
      priceListTripType,
      departPort: originPort,
      arrivePort: destinationPort,
      searchDate: departureDate,
      cabin,
      visaType,
      passengers,
      payloadTypes,
      totalQuantity,
    })

    const successMessage = oneWayResult.trips.length === 0
      ? "No trips found matching your search criteria"
      : `Found ${oneWayResult.trips.length} trip(s) matching your search criteria`

    return {
      success: true,
      message: successMessage,
      data: {
        searchParams: {
          category: normalizedCategory,
          tripType,
          originPort,
          destinationPort,
          departureDate,
          dateRange: {
            from: oneWayResult.dateRange.from.toISOString().split('T')[0],
            to: oneWayResult.dateRange.to.toISOString().split('T')[0],
            daysBeforeAfter: 5,
          },
          cabin,
          visaType,
          passengers,
          totalPassengers: totalQuantity,
        },
        trips: oneWayResult.trips,
      },
    }
  }
}

module.exports = {
  searchTripsWithPricing,
  searchTripsForDirection,
  calculateAvailableSeats,
  findBestPrice,
}
