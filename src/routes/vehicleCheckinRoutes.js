const express = require("express")
const controller = require("../controllers/vehicleCheckinController")
const { authMiddleware } = require("../middleware/authMiddleware")

const router = express.Router()

router.get("/available-trips", authMiddleware, controller.getAvailableTrips)
router.post("/initiate", authMiddleware, controller.initiateCheckin)
router.post("/scan-document", authMiddleware, controller.scanDocument)
router.get("/:checkinId", authMiddleware, controller.getDetails)

module.exports = router
