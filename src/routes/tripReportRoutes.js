const express = require("express")
const router = express.Router()

const { asyncHandler } = require("../middleware/errorHandler")
const { verifyToken } = require("../middleware/authMiddleware")
const controller = require("../controllers/tripReportController")
const { body } = require("express-validator")

// Validation rules
const verifyReportRules = [body("notes").optional().trim()]

const completeReportRules = [body("notes").optional().trim()]

const discrepancyRules = [
  body("type").isIn(["Passenger", "Cargo", "Vehicle", "Weight", "Other"]).withMessage("Invalid discrepancy type"),
  body("description").trim().notEmpty().withMessage("Description is required"),
  body("severity").isIn(["Low", "Medium", "High"]).withMessage("Invalid severity level"),
]

const resolveDiscrepancyRules = [body("resolution").trim().notEmpty().withMessage("Resolution is required")]

// Trip Report Routes

// List all trip reports
router.get("/", verifyToken, asyncHandler(controller.index))

// Get specific trip report by trip ID
router.get("/:tripId", verifyToken, asyncHandler(controller.show))

// Initiate trip report
router.post("/:tripId/initiate", verifyToken, asyncHandler(controller.initiate))

// Refresh manifests from boarding records
router.post("/:tripId/refresh-manifests", verifyToken, asyncHandler(controller.refreshManifests))

// Verify trip report
router.post("/:tripId/verify", verifyToken, verifyReportRules, asyncHandler(controller.verify))

// Complete trip
router.post("/:tripId/complete", verifyToken, completeReportRules, asyncHandler(controller.complete))

// Add discrepancy
router.post("/:tripId/discrepancies", verifyToken, discrepancyRules, asyncHandler(controller.addDiscrepancyHandler))

// Resolve discrepancy
router.patch(
  "/:tripId/discrepancies/:discrepancyId",
  verifyToken,
  resolveDiscrepancyRules,
  asyncHandler(controller.resolveDiscrepancyHandler),
)

module.exports = router
