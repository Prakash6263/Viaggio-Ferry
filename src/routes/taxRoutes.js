const express = require("express")
const { createTax, listTaxes, getTaxById, updateTax, deleteTax } = require("../controllers/taxController")
const { verifyToken, extractCompanyId, extractUserId } = require("../middleware/authMiddleware")
const { checkPermission } = require("../middleware/permissionMiddleware")

const router = express.Router()

// ==================== AUTHENTICATION MIDDLEWARE ====================
router.use(verifyToken)
router.use(extractCompanyId)
router.use(extractUserId)

// ==================== TAX MANAGEMENT ROUTES ====================

/**
 * POST /api/company/taxes
 * Create new tax - requires write permission on taxes
 */
router.post("/", checkPermission("administration", "taxes", "write"), createTax)

/**
 * GET /api/company/taxes
 * List all taxes - requires read permission on taxes
 */
router.get("/", checkPermission("administration", "taxes", "read"), listTaxes)

/**
 * GET /api/company/taxes/:id
 * Get tax details - requires read permission on taxes
 */
router.get("/:id", checkPermission("administration", "taxes", "read"), getTaxById)

/**
 * PUT /api/company/taxes/:id
 * Update tax - requires edit permission on taxes
 */
router.put("/:id", checkPermission("administration", "taxes", "edit"), updateTax)

/**
 * DELETE /api/company/taxes/:id
 * Delete tax - requires delete permission on taxes
 */
router.delete("/:id", checkPermission("administration", "taxes", "delete"), deleteTax)

module.exports = router
