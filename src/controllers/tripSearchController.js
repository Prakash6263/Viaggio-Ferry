const createHttpError = require("http-errors")
const mongoose = require("mongoose")
const { searchTripsWithPricing } = require("../services/tripSearchService")
const connectDB = require("../config/db")

/**
 * POST /api/trip-search
 * Search for trips with pricing based on filter criteria
 * 
 * Request Body:
 * {
 *   category: "passenger" | "vehicle" | "cargo" (required)
 *   tripType: "one_way" | "return" | "round_trip" (required)
 *   originPort: ObjectId (required)
 *   destinationPort: ObjectId (required)
 *   departureDate: Date string (required)
 *   cabin: ObjectId (optional)
 *   visaType: String (optional)
 *   passengers: [
 *     { payloadTypeId: ObjectId, quantity: Number }
 *   ] (required - at least one passenger with payloadTypeId from PayloadType collection)
 * }
 * 
 * Response:
 * {
 *   success: true,
 *   message: "Found X trip(s) matching your search criteria",
 *   data: {
 *     searchParams: { ... },
 *     trips: [
 *       {
 *         trip: { tripName, tripCode, ship, departurePort, arrivalPort, departureDateTime, arrivalDateTime, status },
 *         ticketingRules: { VOID: {...}, REFUND: {...}, REISSUE: {...} },
 *         cabinOptions: [
 *           {
 *             cabin: { name, cabinCode },
 *             availability: { totalSeats, remainingSeats },
 *             pricing: {
 *               breakdown: [
 *                 { payloadType: {...}, quantity, unitPrice, unitTotalPrice, subtotal, taxes, allowedLuggagePieces, allowedLuggageWeight }
 *               ],
 *               totalPrice: Number,
 *               currency: { currencyCode, currencyName },
 *               totalPassengers: Number
 *             }
 *           }
 *         ],
 *         passengers: [{ payloadType: {...}, quantity }],
 *         totalPassengers: Number
 *       }
 *     ]
 *   }
 * }
 */
const searchTrips = async (req, res, next) => {
  try {
    await connectDB()

    const { companyId, user } = req
    const {
      category,
      tripType,
      originPort,
      destinationPort,
      departureDate,
      cabin,
      visaType,
      passengers,
    } = req.body

    // Validate required fields
    if (!category) {
      throw createHttpError(400, "Category is required (passenger, vehicle, or cargo)")
    }

    if (!tripType) {
      throw createHttpError(400, "Trip type is required (one_way, return, or round_trip)")
    }

    if (!originPort) {
      throw createHttpError(400, "Origin port is required")
    }

    if (!destinationPort) {
      throw createHttpError(400, "Destination port is required")
    }

    if (!departureDate) {
      throw createHttpError(400, "Departure date is required")
    }

    // Validate passengers array
    if (!passengers || !Array.isArray(passengers) || passengers.length === 0) {
      throw createHttpError(400, "Passengers array is required with at least one passenger object containing payloadTypeId and quantity")
    }

    // Validate each passenger entry
    for (let i = 0; i < passengers.length; i++) {
      const passenger = passengers[i]
      
      if (!passenger.payloadTypeId) {
        throw createHttpError(400, `Passenger at index ${i} is missing payloadTypeId`)
      }

      if (!mongoose.Types.ObjectId.isValid(passenger.payloadTypeId)) {
        throw createHttpError(400, `Passenger at index ${i} has invalid payloadTypeId format`)
      }

      if (!passenger.quantity || typeof passenger.quantity !== "number" || passenger.quantity < 1) {
        throw createHttpError(400, `Passenger at index ${i} must have a quantity of at least 1`)
      }
    }

    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(originPort)) {
      throw createHttpError(400, "Invalid origin port ID format")
    }

    if (!mongoose.Types.ObjectId.isValid(destinationPort)) {
      throw createHttpError(400, "Invalid destination port ID format")
    }

    if (cabin && !mongoose.Types.ObjectId.isValid(cabin)) {
      throw createHttpError(400, "Invalid cabin ID format")
    }

    // Validate category
    const validCategories = ["passenger", "vehicle", "cargo"]
    if (!validCategories.includes(category.toLowerCase())) {
      throw createHttpError(400, `Invalid category. Must be one of: ${validCategories.join(", ")}`)
    }

    // Validate trip type
    const validTripTypes = ["one_way", "return", "round_trip", "one-way", "round-trip"]
    if (!validTripTypes.includes(tripType.toLowerCase())) {
      throw createHttpError(400, `Invalid trip type. Must be one of: one_way, return, round_trip`)
    }

    // Validate departure date
    const parsedDate = new Date(departureDate)
    if (isNaN(parsedDate.getTime())) {
      throw createHttpError(400, "Invalid departure date format")
    }

    // Determine partnerId if the user is a partner/agent
    let partnerId = null
    if (user && user.layer === "Marine" && user.partnerId) {
      partnerId = user.partnerId
    }

    // Perform search
    const result = await searchTripsWithPricing({
      companyId,
      category: category.toLowerCase(),
      tripType: tripType.toLowerCase(),
      originPort,
      destinationPort,
      departureDate: parsedDate,
      cabin,
      visaType,
      passengers,
      partnerId,
    })

    res.status(200).json(result)
  } catch (error) {
    next(error)
  }
}

/**
 * GET /api/trip-search
 * Search for trips with pricing using query parameters
 * 
 * Query Parameters:
 *   category: "passenger" | "vehicle" | "cargo" (required)
 *   tripType: "one_way" | "return" | "round_trip" (required)
 *   originPort: ObjectId (required)
 *   destinationPort: ObjectId (required)
 *   departureDate: Date string (required)
 *   cabin: ObjectId (optional)
 *   visaType: String (optional)
 *   passengers: JSON string of array, e.g. '[{"payloadTypeId":"xxx","quantity":2}]' (required)
 */
const searchTripsGet = async (req, res, next) => {
  try {
    await connectDB()

    const { companyId, user } = req
    const {
      category,
      tripType,
      originPort,
      destinationPort,
      departureDate,
      cabin,
      visaType,
      passengers: passengersStr,
    } = req.query

    // Validate required fields
    if (!category) {
      throw createHttpError(400, "Category is required (passenger, vehicle, or cargo)")
    }

    if (!tripType) {
      throw createHttpError(400, "Trip type is required (one_way, return, or round_trip)")
    }

    if (!originPort) {
      throw createHttpError(400, "Origin port is required")
    }

    if (!destinationPort) {
      throw createHttpError(400, "Destination port is required")
    }

    if (!departureDate) {
      throw createHttpError(400, "Departure date is required")
    }

    // Parse passengers from JSON string
    let passengers
    if (!passengersStr) {
      throw createHttpError(400, "Passengers query parameter is required (JSON array of {payloadTypeId, quantity})")
    }

    try {
      passengers = JSON.parse(passengersStr)
    } catch (e) {
      throw createHttpError(400, "Invalid passengers format. Must be a valid JSON array")
    }

    if (!Array.isArray(passengers) || passengers.length === 0) {
      throw createHttpError(400, "Passengers must be an array with at least one passenger object")
    }

    // Validate each passenger entry
    for (let i = 0; i < passengers.length; i++) {
      const passenger = passengers[i]
      
      if (!passenger.payloadTypeId) {
        throw createHttpError(400, `Passenger at index ${i} is missing payloadTypeId`)
      }

      if (!mongoose.Types.ObjectId.isValid(passenger.payloadTypeId)) {
        throw createHttpError(400, `Passenger at index ${i} has invalid payloadTypeId format`)
      }

      if (!passenger.quantity || typeof passenger.quantity !== "number" || passenger.quantity < 1) {
        throw createHttpError(400, `Passenger at index ${i} must have a quantity of at least 1`)
      }
    }

    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(originPort)) {
      throw createHttpError(400, "Invalid origin port ID format")
    }

    if (!mongoose.Types.ObjectId.isValid(destinationPort)) {
      throw createHttpError(400, "Invalid destination port ID format")
    }

    if (cabin && !mongoose.Types.ObjectId.isValid(cabin)) {
      throw createHttpError(400, "Invalid cabin ID format")
    }

    // Validate category
    const validCategories = ["passenger", "vehicle", "cargo"]
    if (!validCategories.includes(category.toLowerCase())) {
      throw createHttpError(400, `Invalid category. Must be one of: ${validCategories.join(", ")}`)
    }

    // Validate trip type
    const validTripTypes = ["one_way", "return", "round_trip", "one-way", "round-trip"]
    if (!validTripTypes.includes(tripType.toLowerCase())) {
      throw createHttpError(400, `Invalid trip type. Must be one of: one_way, return, round_trip`)
    }

    // Validate departure date
    const parsedDate = new Date(departureDate)
    if (isNaN(parsedDate.getTime())) {
      throw createHttpError(400, "Invalid departure date format")
    }

    // Determine partnerId if the user is a partner/agent
    let partnerId = null
    if (user && user.layer === "Marine" && user.partnerId) {
      partnerId = user.partnerId
    }

    // Perform search
    const result = await searchTripsWithPricing({
      companyId,
      category: category.toLowerCase(),
      tripType: tripType.toLowerCase(),
      originPort,
      destinationPort,
      departureDate: parsedDate,
      cabin,
      visaType,
      passengers,
      partnerId,
    })

    res.status(200).json(result)
  } catch (error) {
    next(error)
  }
}

module.exports = {
  searchTrips,
  searchTripsGet,
}
