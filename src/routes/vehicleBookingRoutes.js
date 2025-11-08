const express = require("express")
const router = express.Router()
const { verifyToken } = require("../middleware/authMiddleware")
const {
  searchVehicleBookingsValidation,
  createVehicleBookingValidation,
  updateVehicleBookingValidation,
  idParamValidation,
} = require("../validators/vehicleBookingValidators")
const { search, create, getOne, update, checkIn, remove } = require("../controllers/vehicleBookingController")

router.use(verifyToken)

router.get("/", searchVehicleBookingsValidation, search)
router.post("/", createVehicleBookingValidation, create)
router.get("/:id", idParamValidation, getOne)
router.patch("/:id", updateVehicleBookingValidation, update)
router.post("/:id/check-in", idParamValidation, checkIn)
router.delete("/:id", idParamValidation, remove)

module.exports = router
