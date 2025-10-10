const express = require("express")
const router = express.Router()
const controller = require("../controllers/portController")
const {
  createPortValidation,
  updatePortValidation,
  idParamValidation,
  listPortsValidation,
} = require("../validators/portValidators")

router.get("/", listPortsValidation, controller.getAll)
router.get("/:id", idParamValidation, controller.getOne)
router.post("/", createPortValidation, controller.create)
router.put("/:id", updatePortValidation, controller.update)
router.delete("/:id", idParamValidation, controller.remove)

module.exports = router
