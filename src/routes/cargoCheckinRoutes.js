const express = require("express")
const controller = require("../controllers/cargoCheckinController")
const { authMiddleware } = require("../middleware/authMiddleware")

const router = express.Router()

router.get("/available-trips", authMiddleware, controller.getAvailableTrips)
router.post("/initiate", authMiddleware, controller.initiateCheckin)
router.post("/scan-document", authMiddleware, controller.scanDocument)
router.post("/:checkinId/manifest", authMiddleware, controller.addManifestItem)
router.post("/:checkinId/complete-manifest", authMiddleware, controller.completeManifest)
router.get("/:checkinId", authMiddleware, controller.getDetails)

module.exports = router
