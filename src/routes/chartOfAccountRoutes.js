const express = require("express")
const router = express.Router()
const controller = require("../controllers/chartOfAccountController")
const {
  createChartOfAccountValidation,
  updateChartOfAccountValidation,
  idParamValidation,
  listChartOfAccountsValidation,
} = require("../validators/chartOfAccountValidators")
const { verifyCompanyToken, extractCompanyId } = require("../middleware/authMiddleware")

// All routes require company authentication and company ID extraction
router.use(verifyCompanyToken, extractCompanyId)

router.get("/", listChartOfAccountsValidation, controller.getAll)
router.get("/:id", idParamValidation, controller.getOne)
router.post("/", createChartOfAccountValidation, controller.create)
router.put("/:id", updateChartOfAccountValidation, controller.update)
router.delete("/:id", idParamValidation, controller.remove)

module.exports = router
