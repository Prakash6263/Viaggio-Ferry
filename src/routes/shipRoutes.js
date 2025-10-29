const express = require("express")
const router = express.Router()

const { asyncHandler } = require("../middleware/errorHandler")
const {
  createShipRules,
  updateShipRules,
  addPassengerCapacityRules,
  removePassengerCapacityRules,
  addCargoCapacityRules,
  removeCargoCapacityRules,
  addVehicleCapacityRules,
  removeVehicleCapacityRules,
  listShipsValidation,
} = require("../validators/shipValidators")
const controller = require("../controllers/shipController")

// Ship CRUD
router.get("/", listShipsValidation, asyncHandler(controller.index))
router.post("/", createShipRules, asyncHandler(controller.create))
router.get("/:id", asyncHandler(controller.show))
router.patch("/:id", updateShipRules, asyncHandler(controller.patch))
router.delete("/:id", asyncHandler(controller.destroy))

// Passenger Capacity Management
router.post("/:id/passenger-capacity", addPassengerCapacityRules, asyncHandler(controller.addPassengerCapacityHandler))
router.delete(
  "/:id/passenger-capacity",
  removePassengerCapacityRules,
  asyncHandler(controller.removePassengerCapacityHandler),
)

// Cargo Capacity Management
router.post("/:id/cargo-capacity", addCargoCapacityRules, asyncHandler(controller.addCargoCapacityHandler))
router.delete("/:id/cargo-capacity", removeCargoCapacityRules, asyncHandler(controller.removeCargoCapacityHandler))

// Vehicle Capacity Management
router.post("/:id/vehicle-capacity", addVehicleCapacityRules, asyncHandler(controller.addVehicleCapacityHandler))
router.delete(
  "/:id/vehicle-capacity",
  removeVehicleCapacityRules,
  asyncHandler(controller.removeVehicleCapacityHandler),
)

module.exports = router
