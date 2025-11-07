const express = require("express")
const router = express.Router({ mergeParams: true })
const controller = require("../controllers/internalPaymentReceiptController")
const { verifyCompanyToken, extractCompanyId, extractUserId } = require("../middleware/authMiddleware")
const {
  createInternalPaymentValidation,
  updateInternalPaymentValidation,
  idParamValidation,
  listInternalPaymentsValidation,
  confirmPaymentValidation,
} = require("../validators/internalPaymentReceiptValidators")

// Apply company auth middleware to all routes
router.use(verifyCompanyToken, extractCompanyId, extractUserId)

// Validation schemas
router.post("/", createInternalPaymentValidation, controller.create)
router.get("/", listInternalPaymentsValidation, controller.getAll)
router.get("/ledger-balance", controller.getLedgerBalance)
router.get("/:id", idParamValidation, controller.getById)
router.patch("/:id", updateInternalPaymentValidation, controller.update)
router.delete("/:id", idParamValidation, controller.destroy)
router.post("/:id/confirm", confirmPaymentValidation, controller.confirm)

module.exports = router
