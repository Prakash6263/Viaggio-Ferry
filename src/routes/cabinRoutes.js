const express = require("express")
const {
  createCabinValidation,
  updateCabinValidation,
  idParamValidation,
  listCabinsValidation,
} = require("../validators/cabinValidators")
const controller = require("../controllers/cabinController")

const router = express.Router()

router.get("/", listCabinsValidation, controller.getAll)
router.get("/:id", idParamValidation, controller.getOne)
router.post("/", createCabinValidation, controller.create)
router.put("/:id", updateCabinValidation, controller.update)
router.delete("/:id", idParamValidation, controller.remove)

module.exports = router
