const express = require("express")
const router = express.Router()
const { verifyToken } = require("../middleware/authMiddleware")
const { extractCompanyId } = require("../middleware/companyMiddleware")
const cargoBoardingController = require("../controllers/cargoBoardingController")

// All routes require authentication and company context
router.use(verifyToken, extractCompanyId)

// Trip selection and boarding initiation
router.get("/trips/available", cargoBoardingController.getAvailableTrips)
router.post("/trips/initiate", cargoBoardingController.initiateBoardingForTrip)

// Manifest scanning and loading
router.post("/scan", cargoBoardingController.scanManifest)
router.post("/:boardingId/items/:itemId/update-loading", cargoBoardingController.updateItemLoading)
router.post("/:boardingId/complete", cargoBoardingController.completeBoardingForCargo)

// Manifest view
router.get("/:tripId/manifest", cargoBoardingController.getCargoManifest)

module.exports = router
