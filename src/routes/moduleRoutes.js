const express = require("express")
const router = express.Router()

const { asyncHandler } = require("../middleware/errorHandler")
const { createModuleRules } = require("../validators/moduleValidators")
const controller = require("../controllers/moduleController")

router.get("/", asyncHandler(controller.index))
router.post("/", createModuleRules, asyncHandler(controller.create))
router.post("/seed", asyncHandler(controller.seed))

module.exports = router
