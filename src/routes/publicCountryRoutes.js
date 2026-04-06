const express = require("express")
const { getCountries } = require("../controllers/publicCountryController")

const router = express.Router()

// GET /api/public/countries - Get all countries with optional search and pagination
// No authentication required
router.get("/countries", getCountries)

module.exports = router
