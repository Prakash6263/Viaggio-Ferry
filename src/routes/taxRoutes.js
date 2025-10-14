const express = require("express")
const router = express.Router()
const controller = require("../controllers/taxController")
const {
  createTaxValidation,
  updateTaxValidation,
  idParamValidation,
  listTaxesValidation,
} = require("../validators/taxValidators")

router.get("/", listTaxesValidation, controller.list)
router.post("/", createTaxValidation, controller.create)
router.get("/:id", idParamValidation, controller.getOne)
router.put("/:id", updateTaxValidation, controller.update)
router.delete("/:id", idParamValidation, controller.remove)

module.exports = router
