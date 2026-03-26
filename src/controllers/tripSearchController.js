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
 *   adults: Number (default: 1)
 *   children: Number (default: 0)
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
 *               adultPrice: { basicPrice, totalPrice, taxes, passengerType, allowedLuggagePieces, allowedLuggageWeight },
 *               childPrice: { ... },
 *               totalPrice: Number,
 *               currency: { currencyCode, currencyName }
 *             }
 *           }
 *         ],
 *         totalPassengers: Number,
 *         adults: Number,
 *         children: Number
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
      adults,
      children,
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

    // Validate adults and children
    const adultsCount = parseInt(adults) || 1
    const childrenCount = parseInt(children) || 0

    if (adultsCount < 0) {
      throw createHttpError(400, "Adults count cannot be negative")
    }

    if (childrenCount < 0) {
      throw createHttpError(400, "Children count cannot be negative")
    }

    if (adultsCount === 0 && childrenCount === 0) {
      throw createHttpError(400, "At least one passenger is required")
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
      adults: adultsCount,
      children: childrenCount,
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
 * Same as POST but uses query params
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
      adults,
      children,
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

    // Validate adults and children
    const adultsCount = parseInt(adults) || 1
    const childrenCount = parseInt(children) || 0

    if (adultsCount < 0) {
      throw createHttpError(400, "Adults count cannot be negative")
    }

    if (childrenCount < 0) {
      throw createHttpError(400, "Children count cannot be negative")
    }

    if (adultsCount === 0 && childrenCount === 0) {
      throw createHttpError(400, "At least one passenger is required")
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
      adults: adultsCount,
      children: childrenCount,
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
