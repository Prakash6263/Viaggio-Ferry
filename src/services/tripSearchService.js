const mongoose = require("mongoose")
const { Trip } = require("../models/Trip")
const { PriceList } = require("../models/PriceList")
const { PriceListDetail } = require("../models/PriceListDetail")
const { TripAvailability } = require("../models/TripAvailability")
const { TicketingRule } = require("../models/TicketingRule")
const { PayloadType } = require("../models/PayloadType")
const { Cabin } = require("../models/Cabin")
const { Port } = require("../models/Port")

/**
 * Search trips with matching price list details
 * 
 * @param {Object} params - Search parameters
 * @param {String} params.companyId - Company ID (required)
 * @param {String} params.category - passenger, vehicle, or cargo (required)
 * @param {String} params.tripType - one_way or return (required)
 * @param {String} params.originPort - Origin port ID (required)
 * @param {String} params.destinationPort - Destination port ID (required)
 * @param {Date} params.departureDate - Departure date (required)
 * @param {String} params.cabin - Cabin ID (optional)
 * @param {String} params.visaType - Visa type (optional)
 * @param {Number} params.adults - Number of adults (default: 1)
 * @param {Number} params.children - Number of children (default: 0)
 * @param {String} params.partnerId - Partner ID for partner-specific pricing (optional)
 * @returns {Object} - Search results with trips and pricing
 */
const searchTripsWithPricing = async (params) => {
  const {
    companyId,
    category,
    tripType,
    originPort,
    destinationPort,
    departureDate,
    cabin,
    visaType,
    adults = 1,
    children = 0,
    partnerId,
  } = params

  // Validate required parameters
  if (!companyId) throw new Error("Company ID is required")
  if (!category) throw new Error("Category is required")
  if (!tripType) throw new Error("Trip type is required")
  if (!originPort) throw new Error("Origin port is required")
  if (!destinationPort) throw new Error("Destination port is required")
  if (!departureDate) throw new Error("Departure date is required")

  // Validate category
  const validCategories = ["passenger", "vehicle", "cargo"]
  if (!validCategories.includes(category.toLowerCase())) {
    throw new Error(`Invalid category. Must be one of: ${validCategories.join(", ")}`)
  }

  // Convert tripType to match price list detail format
  let priceListTripType = tripType.toLowerCase()
  if (priceListTripType === "one-way") {
    priceListTripType = "one_way"
  } else if (priceListTripType === "round-trip" || priceListTripType === "round_trip") {
    priceListTripType = "round_trip"
  }

  // Parse departure date - search for trips on that day
  const searchDate = new Date(departureDate)
  const startOfDay = new Date(searchDate)
  startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date(searchDate)
  endOfDay.setHours(23, 59, 59, 999)

  // Build trip query
  const tripQuery = {
    company: new mongoose.Types.ObjectId(companyId),
    departurePort: new mongoose.Types.ObjectId(originPort),
    arrivalPort: new mongoose.Types.ObjectId(destinationPort),
    departureDateTime: {
      $gte: startOfDay,
      $lte: endOfDay,
    },
    status: { $in: ["SCHEDULED", "ONGOING"] },
    isDeleted: false,
  }

  // Find matching trips
  const trips = await Trip.find(tripQuery)
    .populate("ship", "name imoNumber")
    .populate("departurePort", "name code country")
    .populate("arrivalPort", "name code country")
    .populate({
      path: "ticketingRules.rule",
      select: "ruleName ruleType restrictedWindowHours normalFee restrictedPenalty conditions",
    })
    .sort({ departureDateTime: 1 })
    .lean()

  if (trips.length === 0) {
    return {
      success: true,
      message: "No trips found matching the search criteria",
      data: {
        searchParams: {
          category,
          tripType,
          originPort,
          destinationPort,
          departureDate,
          cabin,
          visaType,
          adults,
          children,
        },
        trips: [],
      },
    }
  }

  // Build price list detail query
  const priceDetailQuery = {
    originPort: new mongoose.Types.ObjectId(originPort),
    destinationPort: new mongoose.Types.ObjectId(destinationPort),
    ticketType: priceListTripType,
    isDeleted: false,
    isDisabled: false,
  }

  // Add cabin filter if provided
  if (cabin) {
    priceDetailQuery.cabin = new mongoose.Types.ObjectId(cabin)
  }

  // Add visa type filter if provided
  if (visaType) {
    priceDetailQuery.visaType = visaType
  }

  // Find matching price list details
  const priceDetails = await PriceListDetail.find(priceDetailQuery)
    .populate({
      path: "priceList",
      match: {
        company: new mongoose.Types.ObjectId(companyId),
        category: category.toLowerCase(),
        status: "active",
        isDeleted: false,
        effectiveDateTime: { $lte: new Date() },
        // If partnerId is provided, filter by partner assignment
        ...(partnerId ? { partners: new mongoose.Types.ObjectId(partnerId) } : {}),
      },
      populate: {
        path: "currency",
        select: "currencyCode currencyName currentRate",
      },
    })
    .populate("passengerType", "name code category ageRange")
    .populate("cabin", "name cabinCode")
    .populate("originPort", "name code")
    .populate("destinationPort", "name code")
    .populate("taxIds", "code name value type form")
    .lean()

  // Filter out details where priceList is null (didn't match company/category/status)
  const validPriceDetails = priceDetails.filter((detail) => detail.priceList !== null)

  // Get passenger types for adults and children
  const passengerTypes = await PayloadType.find({
    company: new mongoose.Types.ObjectId(companyId),
    category: category.toLowerCase(),
    status: "Active",
    isDeleted: false,
  }).lean()

  // Find adult and child passenger types
  const adultType = passengerTypes.find(
    (pt) => pt.name.toLowerCase().includes("adult") || pt.code === "ADT"
  )
  const childType = passengerTypes.find(
    (pt) => pt.name.toLowerCase().includes("child") || pt.code === "CHD"
  )

  // Build result with trips and matching prices
  const results = []

  for (const trip of trips) {
    // Get trip availability for cabin-level seat info
    const availability = await TripAvailability.findOne({
      company: new mongoose.Types.ObjectId(companyId),
      trip: trip._id,
      isDeleted: false,
    })
      .populate("availabilityTypes.cabins.cabin", "name cabinCode")
      .lean()

    // Get cabin availability based on category
    let cabinAvailability = []
    if (availability && availability.availabilityTypes) {
      const categoryAvailability = availability.availabilityTypes.find(
        (at) => at.type === category.toLowerCase()
      )
      if (categoryAvailability && categoryAvailability.cabins) {
        cabinAvailability = categoryAvailability.cabins.map((c) => ({
          cabin: c.cabin,
          totalSeats: c.seats,
          allocatedSeats: c.allocatedSeats || 0,
          availableSeats: c.seats - (c.allocatedSeats || 0),
        }))
      }
    }

    // Also use tripCapacityDetails from Trip model
    let tripCabinCapacity = []
    if (trip.tripCapacityDetails && trip.tripCapacityDetails[category.toLowerCase()]) {
      tripCabinCapacity = trip.tripCapacityDetails[category.toLowerCase()].map((c) => ({
        cabinId: c.cabinId,
        cabinName: c.cabinName,
        totalSeats: c.totalSeat,
        remainingSeats: c.remainingSeat,
      }))
    }

    // Match price details with this trip's route
    const matchingPrices = validPriceDetails.filter((pd) => {
      // If cabin filter was provided in search, it's already filtered
      // If not, include all cabin prices
      if (cabin) {
        return pd.cabin._id.toString() === cabin
      }
      return true
    })

    // Group prices by cabin
    const pricesByCabin = {}
    for (const price of matchingPrices) {
      const cabinId = price.cabin._id.toString()
      if (!pricesByCabin[cabinId]) {
        pricesByCabin[cabinId] = {
          cabin: price.cabin,
          prices: [],
        }
      }
      pricesByCabin[cabinId].prices.push(price)
    }

    // Calculate total price for each cabin option
    const cabinOptions = []
    for (const cabinId in pricesByCabin) {
      const cabinData = pricesByCabin[cabinId]
      
      // Find availability for this cabin
      const cabinAvail = tripCabinCapacity.find((c) => c.cabinId.toString() === cabinId) ||
        cabinAvailability.find((c) => c.cabin && c.cabin._id.toString() === cabinId)

      // Calculate prices for adults and children
      let adultPrice = null
      let childPrice = null
      let totalPrice = 0

      for (const price of cabinData.prices) {
        const passengerTypeName = price.passengerType?.name?.toLowerCase() || ""
        const passengerTypeCode = price.passengerType?.code || ""

        if (
          passengerTypeName.includes("adult") ||
          passengerTypeCode === "ADT" ||
          (adultType && price.passengerType._id.toString() === adultType._id.toString())
        ) {
          adultPrice = price
        } else if (
          passengerTypeName.includes("child") ||
          passengerTypeCode === "CHD" ||
          (childType && price.passengerType._id.toString() === childType._id.toString())
        ) {
          childPrice = price
        }
      }

      // Calculate total based on passenger counts
      if (adultPrice && adults > 0) {
        totalPrice += adultPrice.totalPrice * adults
      }
      if (childPrice && children > 0) {
        totalPrice += childPrice.totalPrice * children
      } else if (!childPrice && children > 0 && adultPrice) {
        // If no child price, use adult price for children
        totalPrice += adultPrice.totalPrice * children
      }

      // If we only have one price type and no specific adult/child match
      if (!adultPrice && !childPrice && cabinData.prices.length > 0) {
        const defaultPrice = cabinData.prices[0]
        totalPrice = defaultPrice.totalPrice * (adults + children)
        adultPrice = defaultPrice
      }

      cabinOptions.push({
        cabin: cabinData.cabin,
        availability: cabinAvail
          ? {
              totalSeats: cabinAvail.totalSeats || cabinAvail.totalSeat,
              remainingSeats: cabinAvail.remainingSeats || cabinAvail.availableSeats,
            }
          : null,
        pricing: {
          adultPrice: adultPrice
            ? {
                basicPrice: adultPrice.basicPrice,
                totalPrice: adultPrice.totalPrice,
                taxes: adultPrice.taxIds,
                passengerType: adultPrice.passengerType,
                allowedLuggagePieces: adultPrice.allowedLuggagePieces,
                allowedLuggageWeight: adultPrice.allowedLuggageWeight,
                excessLuggagePricePerKg: adultPrice.excessLuggagePricePerKg,
              }
            : null,
          childPrice: childPrice
            ? {
                basicPrice: childPrice.basicPrice,
                totalPrice: childPrice.totalPrice,
                taxes: childPrice.taxIds,
                passengerType: childPrice.passengerType,
                allowedLuggagePieces: childPrice.allowedLuggagePieces,
                allowedLuggageWeight: childPrice.allowedLuggageWeight,
                excessLuggagePricePerKg: childPrice.excessLuggagePricePerKg,
              }
            : null,
          totalPrice: Math.round(totalPrice * 100) / 100,
          currency: adultPrice?.priceList?.currency || childPrice?.priceList?.currency,
          priceListId: adultPrice?.priceList?._id || childPrice?.priceList?._id,
        },
      })
    }

    // Extract ticketing rules for display
    const ticketingRulesFormatted = {}
    if (trip.ticketingRules && trip.ticketingRules.length > 0) {
      for (const tr of trip.ticketingRules) {
        if (tr.rule) {
          ticketingRulesFormatted[tr.ruleType] = {
            ruleName: tr.rule.ruleName,
            restrictedWindowHours: tr.rule.restrictedWindowHours,
            normalFee: tr.rule.normalFee,
            restrictedPenalty: tr.rule.restrictedPenalty,
            conditions: tr.rule.conditions,
          }
        }
      }
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
      },
      ticketingRules: ticketingRulesFormatted,
      cabinOptions,
      totalPassengers: adults + children,
      adults,
      children,
    })
  }

  return {
    success: true,
    message: `Found ${results.length} trip(s) matching your search criteria`,
    data: {
      searchParams: {
        category,
        tripType,
        originPort,
        destinationPort,
        departureDate,
        cabin,
        visaType,
        adults,
        children,
      },
      trips: results,
    },
  }
}

module.exports = {
  searchTripsWithPricing,
}
