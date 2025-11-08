const express = require("express")
const router = express.Router()
const { verifyToken } = require("../middleware/authMiddleware")
const { extractCompanyId } = require("../middleware/companyMiddleware")
const passengerBoardingController = require("../controllers/passengerBoardingController")

// All routes require authentication and company context
router.use(verifyToken, extractCompanyId)

// Trip selection and boarding initiation
router.get("/trips/available", passengerBoardingController.getAvailableTrips)
router.post("/trips/initiate", passengerBoardingController.initiateBoardingForTrip)

// Boarding pass scanning and verification
router.post("/scan", passengerBoardingController.scanBoardingPass)
router.get("/:boardingId/details", passengerBoardingController.getBoardingPassDetails)
router.post("/:boardingId/confirm", passengerBoardingController.confirmBoarding)

// Manifest and data views
router.get("/:tripId/manifest", passengerBoardingController.getPassengerManifest)
router.get("/:tripId/luggage-data", passengerBoardingController.getLuggageData)
router.get("/:tripId/summary", passengerBoardingController.getBoardingSummary)

module.exports = router
