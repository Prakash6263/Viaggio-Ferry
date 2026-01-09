const express = require("express")
const router = express.Router()
const bankCashAccountController = require("../controllers/bankCashAccountController")
const { verifyAdminOrCompany } = require("../middleware/authMiddleware")

// All routes require authentication
router.use(verifyAdminOrCompany)

// Create Bank/Cash Account (with auto-generated ledger)
router.post("/", bankCashAccountController.createBankCashAccount)

// List Bank/Cash Accounts
router.get("/", bankCashAccountController.listBankCashAccounts)

// Get specific Account
router.get("/:id", bankCashAccountController.getBankCashAccountById)

// Update Account
router.put("/:id", bankCashAccountController.updateBankCashAccount)

// Delete Account
router.delete("/:id", bankCashAccountController.deleteBankCashAccount)

module.exports = router
