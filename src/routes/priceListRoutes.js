const express = require("express")
const { 
  createPriceList, 
  listPriceLists, 
  getPriceListById, 
  updatePriceList, 
  deletePriceList,
  addPriceListDetail
} = require("../controllers/priceListController")
const { verifyToken, extractCompanyId, extractUserId } = require("../middleware/authMiddleware")
const { checkPermission } = require("../middleware/permissionMiddleware")

const router = express.Router()

// ==================== AUTHENTICATION MIDDLEWARE ====================
router.use(verifyToken)
router.use(extractCompanyId)
router.use(extractUserId)

// ==================== PRICE LIST HEADER MANAGEMENT ====================

/**
 * POST /api/price-lists
 * Create price list with header and one detail
 * Body: { header: {..., partners: [IDs] }, detail: {...} }
 */
router.post("/", checkPermission("administration", "price_lists", "write"), createPriceList)

/**
 * GET /api/price-lists
 * List price lists with pagination and filters
 */
router.get("/", checkPermission("administration", "price_lists", "read"), listPriceLists)

/**
 * GET /api/price-lists/:id
 * Get price list with all details
 */
router.get("/:id", checkPermission("administration", "price_lists", "read"), getPriceListById)

/**
 * PUT /api/price-lists/:id
 * Update price list header and/or partners
 * Body: { priceListName, currency, status, partners: [IDs], ...etc }
 */
router.put("/:id", checkPermission("administration", "price_lists", "edit"), updatePriceList)

/**
 * DELETE /api/price-lists/:id
 * Delete price list (soft delete)
 */
router.delete("/:id", checkPermission("administration", "price_lists", "delete"), deletePriceList)

// ==================== PRICE LIST DETAILS MANAGEMENT ====================

/**
 * POST /api/price-lists/:id/details
 * Add single detail to price list
 */
router.post("/:id/details", checkPermission("administration", "price_lists", "write"), addPriceListDetail)

module.exports = router


