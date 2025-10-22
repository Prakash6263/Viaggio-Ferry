const express = require("express")
const controller = require("../controllers/b2cCustomerController")
const {
  listB2CCustomerRules,
  createB2CCustomerRules,
  updateB2CCustomerRules,
} = require("../validators/b2cCustomerValidators")
const { asyncHandler } = require("../middleware/errorHandler")

const router = express.Router()

router.get("/", listB2CCustomerRules, asyncHandler(controller.index))
router.post("/", createB2CCustomerRules, asyncHandler(controller.create))
router.get("/by-partner/:partnerId", asyncHandler(controller.byPartner))
router.get("/:id", asyncHandler(controller.show))
router.patch("/:id", updateB2CCustomerRules, asyncHandler(controller.patch))
router.delete("/:id", asyncHandler(controller.destroy))

module.exports = router
