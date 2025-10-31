const express = require("express")
const router = express.Router()
const controller = require("../controllers/bankCashAccountController")
const {
  createBankCashAccountValidation,
  updateBankCashAccountValidation,
  idParamValidation,
  listBankCashAccountsValidation,
} = require("../validators/bankCashAccountValidators")
const { verifyCompanyToken, extractCompanyId } = require("../middleware/authMiddleware")

// All routes require company authentication and company ID extraction
router.use(verifyCompanyToken, extractCompanyId)

router.get("/", listBankCashAccountsValidation, controller.getAll)
router.get("/:id", idParamValidation, controller.getOne)
router.post("/", createBankCashAccountValidation, controller.create)
router.put("/:id", updateBankCashAccountValidation, controller.update)
router.delete("/:id", idParamValidation, controller.remove)

module.exports = router
