const express = require("express")
const {
  createPayloadTypeValidation,
  updatePayloadTypeValidation,
  idParamValidation,
  listPayloadTypesValidation,
} = require("../validators/payloadTypeValidators")
const controller = require("../controllers/payloadTypeController")

const router = express.Router()

router.get("/", listPayloadTypesValidation, controller.getAll)
router.get("/:id", idParamValidation, controller.getOne)
router.post("/", createPayloadTypeValidation, controller.create)
router.put("/:id", updatePayloadTypeValidation, controller.update)
router.delete("/:id", idParamValidation, controller.remove)

module.exports = router
