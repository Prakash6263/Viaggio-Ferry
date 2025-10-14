const express = require("express")
const controller = require("../controllers/agentController")
const { listAgentRules, createAgentRules, updateAgentRules } = require("../validators/agentValidators")
const { asyncHandler } = require("../middleware/errorHandler")

const router = express.Router()

router.get("/", listAgentRules, asyncHandler(controller.index))
router.get("/tree", asyncHandler(controller.tree))
router.get("/options", asyncHandler(controller.options))
router.post("/", createAgentRules, asyncHandler(controller.create))
router.get("/:id", asyncHandler(controller.show))
router.patch("/:id", updateAgentRules, asyncHandler(controller.patch))
router.delete("/:id", asyncHandler(controller.destroy))

module.exports = router
