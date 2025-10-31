const express = require("express")
const controller = require("../controllers/agentController")
const { listAgentRules, createAgentRules, updateAgentRules } = require("../validators/agentValidators")
const { asyncHandler } = require("../middleware/errorHandler")
const { verifyCompanyToken, extractCompanyId } = require("../middleware/authMiddleware")

const router = express.Router()

router.use(verifyCompanyToken, extractCompanyId)

router.get("/", listAgentRules, asyncHandler(controller.index))
router.get("/tree", asyncHandler(controller.tree))
router.get("/options", asyncHandler(controller.options))
router.post("/", createAgentRules, asyncHandler(controller.create))
router.get("/:id", asyncHandler(controller.show))
router.patch("/:id", updateAgentRules, asyncHandler(controller.patch))
router.delete("/:id", asyncHandler(controller.destroy))

module.exports = router
