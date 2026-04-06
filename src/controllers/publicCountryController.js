const countries = require("../data/countries")

// In-memory cache for sorted countries
let cachedCountries = null

// Load and sort countries once
const getCountriesSorted = () => {
  if (!cachedCountries) {
    cachedCountries = [...countries].sort((a, b) =>
      a.name.localeCompare(b.name)
    )
  }
  return cachedCountries
}

// Sanitize query parameter to prevent regex DOS
const sanitizeQuery = (query) => {
  if (!query || typeof query !== "string") return ""
  // Remove special regex characters
  return query
    .toLowerCase()
    .trim()
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .slice(0, 100) // Limit length
}

// Get all countries with optional search and pagination
const getCountries = (req, res) => {
  try {
    const sortedCountries = getCountriesSorted()
    const query = sanitizeQuery(req.query.q || "")

    // Filter by search query if provided
    let filteredCountries = sortedCountries
    if (query) {
      const regex = new RegExp(query, "i")
      filteredCountries = sortedCountries.filter(
        (c) =>
          regex.test(c.name) ||
          regex.test(c.code) ||
          regex.test(c.iso3) ||
          regex.test(c.phoneCode)
      )
    }

    const total = filteredCountries.length

    res.status(200).json({
      success: true,
      message: "Countries fetched successfully",
      data: {
        total,
        countries: filteredCountries
      }
    })
  } catch (error) {
    console.error("[publicCountryController] Error:", error)
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    })
  }
}

module.exports = {
  getCountries
}

