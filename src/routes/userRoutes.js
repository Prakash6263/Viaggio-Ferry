const express = require("express")
const controller = require("../controllers/userController")
const { listUserRules, createUserRules, updateUserRules } = require("../validators/userValidators")
const { asyncHandler } = require("../middleware/errorHandler")

const router = express.Router()

router.get("/", listUserRules, asyncHandler(controller.index))
router.post("/", createUserRules, asyncHandler(controller.create))
router.get("/:id", asyncHandler(controller.show))
router.patch("/:id", updateUserRules, asyncHandler(controller.patch))
router.delete("/:id", asyncHandler(controller.destroy))

module.exports = router
