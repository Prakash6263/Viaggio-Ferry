const express = require("express")
const { createTax, listTaxes, getTaxById, updateTax, deleteTax } = require("../controllers/taxController")
const { verifyToken, verifyCompanyToken, extractCompanyId } = require("../middleware/authMiddleware")

const router = express.Router()

// All routes require company authentication
router.use(verifyToken, verifyCompanyToken, extractCompanyId)

// Tax CRUD operations
router.post("/", createTax)
router.get("/", listTaxes)
router.get("/:id", getTaxById)
router.put("/:id", updateTax)
router.delete("/:id", deleteTax)

module.exports = router
