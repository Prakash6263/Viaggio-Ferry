const express = require("express")
const controller = require("../controllers/partnerController")
const { listPartnerRules, createPartnerRules, updatePartnerRules } = require("../validators/partnerValidators")
const { asyncHandler } = require("../middleware/errorHandler")

const router = express.Router()

router.get("/", listPartnerRules, asyncHandler(controller.index))
router.get("/options", asyncHandler(controller.options))
router.get("/by-layer/:layer", asyncHandler(controller.byLayer))
router.post("/", createPartnerRules, asyncHandler(controller.create))
router.get("/:id", asyncHandler(controller.show))
router.patch("/:id", updatePartnerRules, asyncHandler(controller.patch))
router.delete("/:id", asyncHandler(controller.destroy))

module.exports = router
