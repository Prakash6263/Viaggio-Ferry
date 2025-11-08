const express = require("express")
const router = express.Router()
const { verifyToken } = require("../middleware/authMiddleware")
const { extractCompanyId } = require("../middleware/companyMiddleware")
const vehicleBoardingController = require("../controllers/vehicleBoardingController")

// All routes require authentication and company context
router.use(verifyToken, extractCompanyId)

// Trip selection and boarding initiation
router.get("/trips/available", vehicleBoardingController.getAvailableTrips)
router.post("/trips/initiate", vehicleBoardingController.initiateBoardingForTrip)

// Boarding ticket scanning
router.post("/scan", vehicleBoardingController.scanBoardingTicket)
router.get("/:boardingId/details", vehicleBoardingController.getBoardingDetails)
router.post("/:boardingId/confirm", vehicleBoardingController.confirmBoarding)

module.exports = router
