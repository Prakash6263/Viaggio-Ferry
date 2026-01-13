const express = require("express")
const { verifyToken, extractCompanyId, extractUserId } = require("../middleware/authMiddleware")
const { checkPermission } = require("../middleware/permissionMiddleware")

const router = express.Router()

// Middleware: Require authentication for all routes
router.use(verifyToken)
router.use(extractCompanyId)
router.use(extractUserId)

// EXAMPLE 1: User Management Routes
// POST /api/admin/users - Create user (requires write permission)
router.post("/admin/users", checkPermission("administration", "users", "canWrite"), async (req, res) => {
  try {
    // Controller logic here
    res.json({
      success: true,
      message: "User created successfully (permission verified via checkPermission middleware)",
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// GET /api/admin/users - List users (requires read permission)
router.get("/admin/users", checkPermission("administration", "users", "canRead"), async (req, res) => {
  try {
    res.json({
      success: true,
      message: "Users fetched (permission verified)",
      data: [],
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// PUT /api/admin/users/:id - Update user (requires edit permission)
router.put("/admin/users/:id", checkPermission("administration", "users", "canEdit"), async (req, res) => {
  try {
    res.json({
      success: true,
      message: "User updated (edit permission verified)",
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// DELETE /api/admin/users/:id - Delete user (requires delete permission)
router.delete("/admin/users/:id", checkPermission("administration", "users", "canDelete"), async (req, res) => {
  try {
    res.json({
      success: true,
      message: "User deleted (delete permission verified)",
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// EXAMPLE 2: Finance Routes
// GET /api/finance/reports - View financial reports (read-only)
router.get("/finance/reports", checkPermission("finance", "financial-reports", "canRead"), async (req, res) => {
  try {
    res.json({
      success: true,
      message: "Financial reports fetched",
      data: [],
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// POST /api/finance/journal-entries - Create journal entry
router.post("/finance/journal-entries", checkPermission("finance", "journal-entries", "canWrite"), async (req, res) => {
  try {
    res.json({
      success: true,
      message: "Journal entry created",
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// EXAMPLE 3: Trip Management Routes
// POST /api/trips - Create trip (requires write permission)
router.post("/trips", checkPermission("ship-trips", "trip-management", "canWrite"), async (req, res) => {
  try {
    res.json({
      success: true,
      message: "Trip created with permission verification",
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// GET /api/trips - List trips (requires read permission)
router.get("/trips", checkPermission("ship-trips", "trip-management", "canRead"), async (req, res) => {
  try {
    res.json({
      success: true,
      message: "Trips fetched",
      data: [],
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

module.exports = router
