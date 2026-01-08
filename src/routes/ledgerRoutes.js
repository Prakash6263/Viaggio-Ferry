const express = require("express")
const router = express.Router()
const ledgerController = require("../controllers/ledgerController")
const { verifySuperAdmin, verifyAdminOrCompany } = require("../middleware/authMiddleware")

// Admin routes (super_admin only)
router.post("/admin", verifySuperAdmin, ledgerController.createLedger)
router.get("/admin/allowed-types", verifyAdminOrCompany, ledgerController.getAllowedLedgerTypes)

// Company routes (company users)
router.post("/company", verifyAdminOrCompany, ledgerController.createCompanyLedger)

// List ledgers (both admin and company)
router.get("/", verifyAdminOrCompany, ledgerController.listLedgers)

// Delete ledger
router.delete("/:id", verifyAdminOrCompany, ledgerController.deleteLedger)

module.exports = router
