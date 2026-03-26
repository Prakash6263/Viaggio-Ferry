/**
 * SIDEBAR ROUTES
 * ==============
 * Endpoints for retrieving and validating sidebar menu structure.
 * Uses menuConfig.js as single source of truth.
 */

const express = require("express")
const router = express.Router()
const { getSidebar, validateSidebarConfig } = require("../controllers/sidebarController")
const { verifyToken, extractCompanyId, extractUserId } = require("../middleware/authMiddleware")

router.use(verifyToken)
router.use(extractCompanyId)
router.use(extractUserId)

router.get("/", getSidebar)
router.get("/validation", validateSidebarConfig)

module.exports = router
