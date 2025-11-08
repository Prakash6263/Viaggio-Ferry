const express = require("express")
const router = express.Router()
const { verifyToken } = require("../middleware/authMiddleware")
const {
  searchCargoBookingsValidation,
  createCargoBookingValidation,
  updateCargoBookingValidation,
  idParamValidation,
} = require("../validators/cargoBookingValidators")
const { search, create, getOne, update, remove } = require("../controllers/cargoBookingController")

router.use(verifyToken)

router.get("/", searchCargoBookingsValidation, search)
router.post("/", createCargoBookingValidation, create)
router.get("/:id", idParamValidation, getOne)
router.patch("/:id", updateCargoBookingValidation, update)
router.delete("/:id", idParamValidation, remove)

module.exports = router
