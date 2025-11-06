const express = require("express")
const router = express.Router()
const controller = require("../controllers/agentTopupController")
const { verifyCompanyToken, extractCompanyId, extractUserId } = require("../middleware/authMiddleware")
const {
  createAgentTopupValidation,
  updateAgentTopupValidation,
  idParamValidation,
  listAgentTopupsValidation,
  updateConfirmationValidation,
  rejectAgentTopupValidation,
} = require("../validators/agentTopupValidators")

router.use(verifyCompanyToken, extractCompanyId, extractUserId)

router.get("/", listAgentTopupsValidation, controller.getAll)
router.get("/:id", idParamValidation, controller.getOne)
router.post("/", createAgentTopupValidation, controller.create)
router.put("/:id", updateAgentTopupValidation, controller.update)
router.post("/:id/approve", idParamValidation, controller.approve)
router.post("/:id/reject", rejectAgentTopupValidation, controller.reject)
router.post("/:id/payor-confirmation", updateConfirmationValidation, controller.updatePayorConfirmation)
router.post("/:id/payee-confirmation", updateConfirmationValidation, controller.updatePayeeConfirmation)
router.delete("/:id", idParamValidation, controller.remove)

module.exports = router
