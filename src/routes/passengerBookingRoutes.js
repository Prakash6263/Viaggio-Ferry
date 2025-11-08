const express = require("express")
const router = express.Router()
const { verifyToken } = require("../middleware/authMiddleware")
const {
  searchPassengerBookingsValidation,
  createPassengerBookingValidation,
  updatePassengerBookingValidation,
  idParamValidation,
} = require("../validators/passengerBookingValidators")
const {
  search,
  create,
  getOne,
  update,
  checkIn,
  board,
  cancel,
  remove,
} = require("../controllers/passengerBookingController")

// All routes require company authentication
router.use(verifyToken)

router.get("/", searchPassengerBookingsValidation, search)
router.post("/", createPassengerBookingValidation, create)
router.get("/:id", idParamValidation, getOne)
router.patch("/:id", updatePassengerBookingValidation, update)
router.post("/:id/check-in", idParamValidation, checkIn)
router.post("/:id/board", idParamValidation, board)
router.post("/:id/cancel", idParamValidation, cancel)
router.delete("/:id", idParamValidation, remove)

module.exports = router
