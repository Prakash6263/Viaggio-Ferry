const express = require("express")
const router = express.Router()
const { asyncHandler } = require("../middleware/errorHandler")
const controller = require("../controllers/metaController")

router.get("/layers", asyncHandler(controller.layers))
router.get("/modules", asyncHandler(controller.modules))

module.exports = router
