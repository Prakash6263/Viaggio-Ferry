const express = require("express")
const controller = require("../controllers/passengerCheckinController")
const { authMiddleware } = require("../middleware/authMiddleware")

const router = express.Router()

router.get("/available-trips", authMiddleware, controller.getAvailableTrips)
router.post("/initiate", authMiddleware, controller.initiateCheckin)
router.post("/scan-document", authMiddleware, controller.scanDocument)
router.post("/:checkinId/luggage", authMiddleware, controller.addLuggage)
router.delete("/:checkinId/luggage/:luggageId", authMiddleware, controller.removeLuggage)
router.post("/:checkinId/confirm-luggage", authMiddleware, controller.confirmLuggage)
router.post("/:checkinId/excess-ticket", authMiddleware, controller.createExcessTicket)
router.post("/:checkinId/confirm-payment", authMiddleware, controller.confirmPayment)
router.get("/:checkinId", authMiddleware, controller.getDetails)

module.exports = router
